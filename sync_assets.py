import os
import shutil
import sys

sys.stdout.reconfigure(encoding='utf-8')

root_dir = os.path.dirname(os.path.abspath(__file__))
target_dirs = [
    os.path.join(root_dir, 'www')
]
android_public = os.path.join(root_dir, 'android', 'app', 'src', 'main', 'assets', 'public')
if os.path.exists(android_public):
    target_dirs.append(android_public)

qlc_dir = os.path.join(root_dir, 'Quanlicanhan2.0')
if os.path.exists(qlc_dir):
    target_dirs.append(qlc_dir)
    target_dirs.append(os.path.join(qlc_dir, 'www'))

files_to_copy = [
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
]

folders_to_copy = [
    'fonts',
    'services',
    'ui',
    'styles',
    'assets'
]

for target in target_dirs:
    os.makedirs(target, exist_ok=True)
    copied_files = 0
    for f in files_to_copy:
        src = os.path.join(root_dir, f)
        dst = os.path.join(target, f)
        if os.path.exists(src):
            shutil.copy2(src, dst)
            copied_files += 1

    copied_folders = 0
    for folder in folders_to_copy:
        src_f = os.path.join(root_dir, folder)
        dst_f = os.path.join(target, folder)
        if os.path.exists(src_f):
            shutil.copytree(src_f, dst_f, dirs_exist_ok=True)
            copied_folders += 1

    print(f"Synced {copied_files} files and {copied_folders} folders to {target}")

print("All targets synchronized successfully!")
