# Пример создания оператора

Чтобы создать нового оператора, создайте файл в директории `pjsip.d` по образцу:

```
; Оператор X
[operatorX_aor]
type=aor
max_contacts=5
remove_existing=yes
minimum_expiration=5
default_expiration=60
qualify_frequency=30

[operatorX_auth]
type=auth
auth_type=userpass
username=operatorX
password=operatorXpass
realm=localhost

[operatorX]
type=endpoint
transport=transport-wss
context=default
disallow=all
allow=opus,ulaw,alaw
webrtc=yes
rtp_symmetric=yes
force_rport=yes
ice_support=yes
media_encryption=dtls
dtls_verify=fingerprint
dtls_setup=actpass
dtls_cert_file=/etc/asterisk/keys/asterisk.pem
dtls_private_key=/etc/asterisk/keys/asterisk.key
callerid=Operator X <200X>
auth=operatorX_auth
aors=operatorX_aor
direct_media=no
rewrite_contact=yes

[operatorX]
type=identify
endpoint=operatorX
match=0.0.0.0/0
```

Где X - номер оператора.

Затем добавьте соответствующий внутренний номер в файл `extensions.conf`:

```
exten => 200X,1,Answer()
exten => 200X,n,Playback(hello-world)
exten => 200X,n,Hangup()
```
