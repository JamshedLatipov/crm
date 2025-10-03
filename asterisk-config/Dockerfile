## Dockerfile for Asterisk (custom build with WebRTC + ARI)
FROM debian:bullseye-slim

ENV ASTERISK_VERSION=22-current

# Install dependencies (including WebRTC codecs and libs)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    wget \
    subversion \
    sngrep \
    git \
    curl \
    ca-certificates \
    libxml2-dev \
    libncurses5-dev \
    uuid-dev \
    libjansson-dev \
    libssl-dev \
    libedit-dev \
    libsqlite3-dev \
    libcurl4-openssl-dev \
    libnewt-dev \
    libspandsp-dev \
    libiksemel-dev \
    liblua5.2-dev \
    liburiparser-dev \
    libxslt1-dev \
    xmlstarlet \
    pkg-config \
    libopus-dev \
    libogg-dev \
    libvpx-dev \
    libspeex-dev \
    libavcodec-dev \
    libavformat-dev \
    libavutil-dev \
    libswresample-dev \
    libpq-dev \
    unixodbc \
    unixodbc-dev \
    odbc-postgresql \
    stun-client \
    libsrtp2-dev \
    bash \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system asterisk && useradd --system --create-home --home-dir /home/asterisk --gid asterisk --shell /bin/bash asterisk \
    && mkdir -p /var/run/asterisk /var/lib/asterisk /var/spool/asterisk/outgoing /var/log/asterisk \
    && touch /home/asterisk/.asterisk_history \
    && chown -R asterisk:asterisk /home/asterisk /var/run/asterisk /var/lib/asterisk /var/spool/asterisk /var/log/asterisk

RUN cd /usr/src && \
    wget https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-${ASTERISK_VERSION}.tar.gz && \
    tar xzf asterisk-${ASTERISK_VERSION}.tar.gz && \
    rm asterisk-${ASTERISK_VERSION}.tar.gz && \
    ls -l /usr/src && \
    cd /usr/src/$(ls /usr/src | grep -E '^asterisk-22') && \
    ./configure --with-jansson-bundled && \
    make menuselect.makeopts && \
    menuselect/menuselect \
        --enable codec_opus \
        --enable codec_speex \
        --enable res_http_websocket \
        --enable chan_pjsip \
        --enable res_rtp_asterisk \
        --enable cdr_pgsql \
        --enable res_odbc \
        --enable res_srtp \
        --enable res_ari \
        --enable res_ari_applications \
        --enable res_ari_events \
        --enable res_ari_model \
        menuselect.makeopts && \
    make -j$(nproc) && \
    make install && \
    make samples && \
    make config && \
    ldconfig

# Clean up build dependencies and sources
WORKDIR /
RUN rm -rf /usr/src/asterisk-${ASTERISK_VERSION} && \
    mkdir -p /etc/asterisk/pjsip.d && \
    mkdir -p /etc/asterisk/keys && \
    chown -R asterisk:asterisk /etc/asterisk/pjsip.d /etc/asterisk/keys

# Copy certificate creation script
COPY create_cert.sh /tmp/create_cert.sh
# Normalize line endings (fix possible CRLF) and run the script
RUN sed -i 's/\r$//' /tmp/create_cert.sh && \
    chmod +x /tmp/create_cert.sh && \
    /tmp/create_cert.sh && \
    rm /tmp/create_cert.sh

# Expose ports for SIP and RTP
EXPOSE 5060/udp 5060/tcp 5061/tcp 8088/tcp 8089/tcp 8443/tcp 10000-20000/udp

# Set user and entrypoint
USER asterisk
ENTRYPOINT ["/usr/sbin/asterisk", "-f"]
