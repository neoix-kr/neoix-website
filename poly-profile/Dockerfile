FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
# /profile 경로로 서빙 (ALB 규칙 /profile* → 이 컨테이너)
COPY site/ /usr/share/nginx/html/profile/
