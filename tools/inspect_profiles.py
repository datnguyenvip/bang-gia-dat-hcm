"""Liệt kê metadata (không phải khóa) của các .mobileprovision."""
import plistlib, re, sys, glob, hashlib
files = sys.argv[1:]
for f in files:
    d = open(f, 'rb').read()
    m = re.search(rb'<\?xml.*?</plist>', d, re.S)
    if not m: print(f, 'không đọc được'); continue
    p = plistlib.loads(m.group(0))
    ent = p.get('Entitlements', {})
    typ = ('AdHoc' if p.get('ProvisionedDevices') and not ent.get('get-task-allow') else
           'Development' if ent.get('get-task-allow') else
           'Enterprise' if p.get('ProvisionsAllDevices') else 'App Store')
    certs = [hashlib.sha1(c).hexdigest().upper() for c in p.get('DeveloperCertificates', [])]
    print('FILE   :', f)
    print('  Name :', p.get('Name'))
    print('  AppID:', ent.get('application-identifier'))
    print('  Team :', p.get('TeamIdentifier'))
    print('  Type :', typ, '| Hết hạn:', p.get('ExpirationDate'))
    print('  Cert SHA1:', certs)
