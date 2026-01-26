
## Production Server Access

### SSH into American Cloud (Coolify)
```bash
ssh -i ~/.ssh/eapen-coolify.txt cloud@172.252.211.242
```

### HeyDev Container Info
- **Container name**: `server-swockw8oo88ow0w0ocgc4ggw-172822239790` (may change on redeploy)
- **Find container**: `sudo docker ps --format '{{.Names}}\t{{.Ports}}' | grep ':3000'`
- **Database location**: `/var/lib/docker/volumes/swockw8oo88ow0w0ocgc4ggw_heydev-data/_data/heydev.db`

### Common Commands
```bash
# List heydev containers
sudo docker ps --format '{{.Names}}' | grep -i heydev

# Access SQLite database directly on host
sudo sqlite3 /var/lib/docker/volumes/swockw8oo88ow0w0ocgc4ggw_heydev-data/_data/heydev.db

# View database tables
sudo sqlite3 /var/lib/docker/volumes/swockw8oo88ow0w0ocgc4ggw_heydev-data/_data/heydev.db '.tables'

# Check container logs
sudo docker logs server-swockw8oo88ow0w0ocgc4ggw-172822239790 --tail 100
```

### Notes
- Docker requires `sudo` on this server
- SQLite3 is installed on the host, not in the container
- Database is on a Docker volume, accessible from host path
