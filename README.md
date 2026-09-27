# Free VPC Dashboard

Interactive web dashboard for managing the Free VPC fleet, runner slots, and Firecracker micro-VMs.

Hosted on Cloudflare Pages and protected by Cloudflare Zero Trust (Access) at `dash.unsafie.com`.

## Features
- Real-time fleet overview (Active Runners, MicroVMs, Subnet allocation).
- Runner Slots grid (`az-1` to `az-20`, `10.2.0.0/16` Private CIDR).
- Instant MicroVM provisioning (`POST /v1/vms`) with custom specs (vCPUs, RAM, Disk, Base Image, SSH keys).
- MicroVM termination and lifecycle management.
- Batch spawn control for spinning up 20 runner nodes in parallel.
- Copy-pasteable SSH commands for instant connection over Cloudflare Mesh / Tunnel.
- Dark mode cyber UI built with Vite and Svelte.

## Tech Stack
- Frontend: Svelte 4, Vite 5
- Auth: Cloudflare Zero Trust (Cloudflare Access OTP)
- Hosting: Cloudflare Pages / Edge
- Backend API: `api.unsafie.com` (Cloudflare Workers + D1)

## Development
```bash
npm install
npm run dev
npm run build
```
