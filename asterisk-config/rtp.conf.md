# rtp.conf

**Purpose:** RTP settings for media streams (port ranges, codecs behavior, and NAT traversal helpers).

**Key settings:**
- RTP port range, `rtpstart` / `rtpend`
- `icesupport` and `rtpkeepalive` tuning

**Notes:**
- Ensure RTP range matches firewall/NAT rules and TURN configuration.
- Adjust packetization and jitter settings for call quality tuning.