#!/bin/bash

# Скрипт для создания нового оператора

if [ $# -ne 2 ]; then
    echo "Использование: $0 <имя_оператора> <внутренний_номер>"
    exit 1
fi

OPERATOR_NAME=$1
EXTENSION=$2
CONF_FILE="pjsip.d/${OPERATOR_NAME}.conf"

# Создаем конфигурационный файл оператора
cat > "$CONF_FILE" << EOF
; Оператор ${OPERATOR_NAME}
[${OPERATOR_NAME}_aor]
type=aor
max_contacts=5
remove_existing=yes
minimum_expiration=5
default_expiration=60
qualify_frequency=30

[${OPERATOR_NAME}_auth]
type=auth
auth_type=userpass
username=${OPERATOR_NAME}
password=${OPERATOR_NAME}pass
realm=localhost

[${OPERATOR_NAME}]
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
callerid=Operator ${OPERATOR_NAME} <${EXTENSION}>
auth=${OPERATOR_NAME}_auth
aors=${OPERATOR_NAME}_aor
direct_media=no
dtmfmode=rfc4733
rewrite_contact=yes

[${OPERATOR_NAME}]
type=identify
endpoint=${OPERATOR_NAME}
match=0.0.0.0/0
EOF

echo "Создан файл конфигурации для оператора ${OPERATOR_NAME} с внутренним номером ${EXTENSION}"
echo "Не забудьте добавить соответствующее расширение в extensions.conf и перезапустить Asterisk"

cat << EOF

Для добавления расширения в extensions.conf добавьте следующие строки:

exten => ${EXTENSION},1,Answer()
exten => ${EXTENSION},n,Playback(hello-world)
exten => ${EXTENSION},n,Hangup()

EOF
