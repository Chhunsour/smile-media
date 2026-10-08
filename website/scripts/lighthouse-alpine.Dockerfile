FROM alpine:3.22
RUN apk add --no-cache chromium nodejs npm ca-certificates font-noto-emoji font-liberation
RUN npm install --global lighthouse@13.4.0 serve@14.2.4
ENV CHROME_PATH=/usr/bin/chromium-browser
WORKDIR /tmp
