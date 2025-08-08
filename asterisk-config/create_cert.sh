#!/bin/bash
# Создаем конфигурационный файл OpenSSL
cat > /tmp/openssl.cnf << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = RU
ST = State
L = City
O = Organization
CN = asterisk

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = asterisk
IP.1 = 127.0.0.1
EOF

# Генерируем ключ и сертификат
cd /etc/asterisk/keys
openssl genrsa -out asterisk.key 2048
openssl req -new -sha256 -key asterisk.key -out asterisk.csr -config /tmp/openssl.cnf
openssl x509 -req -sha256 -days 3650 -in asterisk.csr -signkey asterisk.key -out asterisk.pem -extensions v3_req -extfile /tmp/openssl.cnf

# Очистка и установка прав
rm asterisk.csr /tmp/openssl.cnf
chmod 644 asterisk.pem
chmod 600 asterisk.key
echo "Certificates generated successfully with modern parameters!"
