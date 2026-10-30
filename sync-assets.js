const fs = require('fs');
const path = require('path');

const targetDirs = [
    path.join(__dirname, 'www')
];

const androidPublicDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'assets', 'public');
if (fs.existsSync(androidPublicDir)) {
    targetDirs.push(androidPublicDir);
}

if (fs.existsSync(path.join(__dirname, 'Quanlicanhan2.0'))) {
    targetDirs.push(path.join(__dirname, 'Quanlicanhan2.0', 'www'));
}

const assetsToCopy = [
    'index.html',
    'style.css',
    'script.js',
    'xlsx.full.min.js',
    'manifest.json',
    'sw.js',
    'icon.svg',
    'icon-192.png',
    'icon-512.png',
    'apple-touch-icon.png',
    'icon.ico'
];

const foldersToCopy = [
    'fonts',
    'services',
    'ui',
    'styles',
    'assets'
];

function copyFolderSync(from, to) {
    if (!fs.existsSync(to)) {
        fs.mkdirSync(to, { recursive: true });
    }
    fs.readdirSync(from).forEach(element => {
        const fromPath = path.join(from, element);
        const toPath = path.join(to, element);
        if (fs.lstatSync(fromPath).isFile()) {
            fs.copyFileSync(fromPath, toPath);
        } else {
            copyFolderSync(fromPath, toPath);
        }
    });
}

function sync() {
    console.log('🔄 Đang đồng bộ hóa tài nguyên TreTH v4.0 vào www/...');

    targetDirs.forEach(targetDir => {
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        let count = 0;
        assetsToCopy.forEach(file => {
            const srcPath = path.join(__dirname, file);
            const destPath = path.join(targetDir, file);
            if (fs.existsSync(srcPath)) {
                fs.copyFileSync(srcPath, destPath);
                count++;
            }
        });

        foldersToCopy.forEach(folder => {
            const srcFolder = path.join(__dirname, folder);
            const destFolder = path.join(targetDir, folder);
            if (fs.existsSync(srcFolder)) {
                copyFolderSync(srcFolder, destFolder);
            }
        });

        console.log(`✅ Đồng bộ thành công ${count} files vào ${targetDir}`);
    });

    // Đồng bộ cả vào thư mục Quanlicanhan2.0 gốc
    const qlcFolder = path.join(__dirname, 'Quanlicanhan2.0');
    if (fs.existsSync(qlcFolder)) {
        assetsToCopy.forEach(file => {
            const srcPath = path.join(__dirname, file);
            const destPath = path.join(qlcFolder, file);
            if (fs.existsSync(srcPath)) {
                fs.copyFileSync(srcPath, destPath);
            }
        });
        foldersToCopy.forEach(folder => {
            const srcFolder = path.join(__dirname, folder);
            const destFolder = path.join(qlcFolder, folder);
            if (fs.existsSync(srcFolder)) {
                copyFolderSync(srcFolder, destFolder);
            }
        });
    }
}

sync();

