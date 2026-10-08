"""Install the pinned, verified official Windows Godot export template."""
import hashlib, os, pathlib, tempfile, urllib.request, zipfile
VERSION='4.6.3.stable'
ARCHIVE_SHA512='da606b61c10157844f8300172df374472665f95015495cb1a7cd132c40ede404faa96cc1016a4b9662db9909ddea69632c4948b2cd11163438dad4808881fb68'
BINARY_SHA512='2e558aa8812d0acac9dea1895f01883ea9b84e305716d56e42e817491b9de07811ee0c393a7e4d042b363a1ac4d289898b0c9d0bc50ac3c958693cc11057d3c5'
URL='https://github.com/godotengine/godot-builds/releases/download/4.6.3-stable/Godot_v4.6.3-stable_export_templates.tpz'
def digest(path):
 h=hashlib.sha512()
 with path.open('rb') as stream:
  while block:=stream.read(4*1024*1024):h.update(block)
 return h.hexdigest()
data=pathlib.Path(os.environ.get('XDG_DATA_HOME','/workspace/.ultimateman-tools/data'))
target=data/'godot/export_templates'/VERSION/'windows_release_x86_64.exe'
if target.exists() and digest(target)==BINARY_SHA512:
 print('Verified Windows export template already installed.')
else:
 target.parent.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='ultimateman-templates-') as temp:
  archive=pathlib.Path(temp)/'templates.tpz'
  print('Downloading official export templates (1.26 GB); retained Windows template is about 105 MB.',flush=True)
  with urllib.request.urlopen(URL) as response,archive.open('wb') as stream:
   while block:=response.read(4*1024*1024):stream.write(block)
  if digest(archive)!=ARCHIVE_SHA512:raise RuntimeError('Official archive checksum verification failed.')
  with zipfile.ZipFile(archive) as package:target.write_bytes(package.read('templates/windows_release_x86_64.exe'))
  if digest(target)!=BINARY_SHA512:target.unlink();raise RuntimeError('Extracted template checksum verification failed.')
 print('Installed verified Godot 4.6.3 Windows template.')
