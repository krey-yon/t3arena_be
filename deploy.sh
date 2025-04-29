cd /root/backend_projects/t3arena_be
git pull origin main
npm install
npm run build
pm2 start npm -- start