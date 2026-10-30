const express = require('express');
const path = require('path');
const fs = require('fs');
const { execFileSync, execSync } = require('child_process');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '5mb' }));

// Luôn tắt bộ nhớ đệm HTTP cho HTML, JS, CSS, SW & Manifest để PWA / Mobile luôn nhận bản mới nhất
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (
    p === '/' ||
    p.endsWith('.html') ||
    p.endsWith('.js') ||
    p.endsWith('.css') ||
    p.endsWith('.json')
  ) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// API: Đồng bộ tài nguyên & Đẩy code trực tiếp lên GitHub để kích hoạt GitHub Actions Build APK
app.post('/api/github-sync', async (req, res) => {
  const rawToken = String((req.body && req.body.token) || process.env.GITHUB_TOKEN || '').trim();
  const rawRepo = String((req.body && req.body.repo) || 'vithao-gihub/treth-vthao').trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '');
  const commitMsg = String(
    (req.body && req.body.commitMessage) ||
    'chore(release): cập nhật giao diện di động, bàn phím ảo & xóa cache TreTH v4.2.0'
  ).trim();

  if (!rawToken) {
    return res.status(400).json({
      ok: false,
      error: 'Vui lòng nhập GitHub Personal Access Token (ghp_... hoặc github_pat_...)!'
    });
  }

  if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(rawRepo)) {
    return res.status(400).json({
      ok: false,
      error: 'Tên kho lưu trữ GitHub không hợp lệ (ví dụ hợp lệ: vithao-gihub/treth-vthao).'
    });
  }

  const tmpDir = `/tmp/treth-github-sync-${Date.now()}`;
  try {
    // 1. Đồng bộ toàn bộ tài nguyên mới nhất vào thư mục www/
    execFileSync('node', [path.join(__dirname, 'sync-assets.js')], { cwd: __dirname, stdio: 'pipe' });

    // 2. Tạo thư mục tạm và clone nhánh chính từ GitHub
    fs.mkdirSync(tmpDir, { recursive: true });
    const remoteUrl = `https://x-access-token:${encodeURIComponent(rawToken)}@github.com/${rawRepo}.git`;

    let defaultBranch = 'main';
    try {
      execFileSync('git', ['clone', '--depth', '1', remoteUrl, tmpDir], { stdio: 'pipe' });
      const branchOut = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: tmpDir, stdio: 'pipe' })
        .toString()
        .trim();
      if (branchOut && branchOut !== 'HEAD') defaultBranch = branchOut;
    } catch (cloneErr) {
      // Nếu repo trống hoặc chưa có nhánh, khởi tạo mới
      execFileSync('git', ['init'], { cwd: tmpDir, stdio: 'pipe' });
      execFileSync('git', ['checkout', '-b', 'main'], { cwd: tmpDir, stdio: 'pipe' });
      execFileSync('git', ['remote', 'add', 'origin', remoteUrl], { cwd: tmpDir, stdio: 'pipe' });
    }

    // 3. Sao chép toàn bộ mã nguồn đã cập nhật từ workspace sang thư mục git tạm
    const excludeNames = new Set([
      'node_modules',
      '.git',
      '.playwright-cli',
      'dist-electron',
      'dist-apk',
      '.DS_Store'
    ]);

    function copyWorkspaceRecursive(srcDir, destDir) {
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      const entries = fs.readdirSync(srcDir, { withFileTypes: true });
      for (const entry of entries) {
        if (excludeNames.has(entry.name)) continue;
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);
        if (entry.isDirectory()) {
          copyWorkspaceRecursive(srcPath, destPath);
        } else if (entry.isFile()) {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    }

    copyWorkspaceRecursive(__dirname, tmpDir);

    // 4. Cấu hình user, tạo commit (cho phép cả commit rỗng để kích hoạt lại GitHub Actions) và đẩy lên GitHub
    execFileSync('git', ['config', 'user.name', 'TreTH Auto Sync'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['config', 'user.email', 'sync@treth.app'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['add', '-A'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['commit', '--allow-empty', '-m', commitMsg], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['push', 'origin', `HEAD:${defaultBranch}`], { cwd: tmpDir, stdio: 'pipe' });

    const commitSha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: tmpDir, stdio: 'pipe' })
      .toString()
      .trim();

    // 5. Kích hoạt thêm workflow_dispatch (nếu có quyền workflow) để đảm bảo tiến trình build APK chạy ngay
    try {
      await fetch(`https://api.github.com/repos/${rawRepo}/actions/workflows/build-apk.yml/dispatches`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${rawToken}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'TreTH-Sync-Engine'
        },
        body: JSON.stringify({ ref: defaultBranch })
      });
    } catch (_) {}

    return res.json({
      ok: true,
      repo: rawRepo,
      branch: defaultBranch,
      commitSha,
      actionsUrl: `https://github.com/${rawRepo}/actions`,
      releasesUrl: `https://github.com/${rawRepo}/releases`
    });
  } catch (err) {
    const safeMsg = String(err.stderr ? err.stderr.toString() : err.message || 'Lỗi không xác định')
      .replace(/x-access-token:[^@]+@/g, 'x-access-token:***@');
    return res.status(500).json({
      ok: false,
      error: `Không thể đẩy lên GitHub: ${safeMsg}`
    });
  } finally {
    try {
      execSync(`rm -rf "${tmpDir}"`);
    } catch (_) {}
  }
});

app.use(express.static(__dirname));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`TreTH server running at http://${HOST}:${PORT}`);
});
