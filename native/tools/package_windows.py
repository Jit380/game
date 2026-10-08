"""Package the exported, self-contained Windows executable for players."""
import pathlib,zipfile,hashlib,struct
root=pathlib.Path(__file__).resolve().parents[2]
exe=root/'dist/windows/Ultimateman.exe'
if not exe.exists():raise RuntimeError('Export the Windows executable before packaging.')
binary=exe.read_bytes()
if binary[:2]!=b'MZ':raise RuntimeError('Windows executable is missing its DOS header.')
pe=struct.unpack_from('<I',binary,0x3c)[0]
if binary[pe:pe+4]!=b'PE\0\0' or struct.unpack_from('<H',binary,pe+4)[0]!=0x8664:raise RuntimeError('Expected Windows x64 executable.')

archive=root/'dist/Ultimateman-Windows.zip'
readme='''ULTIMATEMAN — FIRST RESPONSE\n\nExtract all files, then double-click Ultimateman.exe.\nNo browser, Node.js, or Godot installation is required.\nWindows 10/11 x64; graphics driver with OpenGL 3.3 support.\n\nWASD: move    Mouse: camera    Shift: sprint\nSpace: jump (Shift+Space for higher jump; hold while falling to glide)\nQ: rooftop leap    E: wall grip / mission interaction\nLeft-click or F: attack    1/2/3: electricity / water / ice\nC: dodge    R: full-aura blast    Escape: pause/resume\n\nFollow Chapter One through a criminal pursuit, witness rescue, rooftop investigation, and Warden confrontation. Choose Play the Warden Encounter for an immediate boss battle.\n\nThis is an original, stylized playable prototype. Tested with the Linux engine; the Windows executable has been exported and structurally verified, but has not been run on a Windows machine yet.\n'''
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as out:
 out.write(exe,'Ultimateman/Ultimateman.exe')
 out.writestr('Ultimateman/READ ME.txt',readme)
 out.write(root/'native/LICENSES.md','Ultimateman/LICENSES.md')
 out.write(root/'native/GODOT-COPYRIGHT.txt','Ultimateman/GODOT-COPYRIGHT.txt')
with zipfile.ZipFile(archive) as check:
 if check.testzip():raise RuntimeError('Archive verification failed')
sha=hashlib.sha256(archive.read_bytes()).hexdigest()
(root/'dist/SHA256SUMS.txt').write_text(sha+'  Ultimateman-Windows.zip\n')
print(f'Packaged {archive.name}: {archive.stat().st_size/1024/1024:.1f} MiB; SHA-256 {sha}')
