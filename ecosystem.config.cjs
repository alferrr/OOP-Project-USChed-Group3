/**
 * PM2 process file. Start with:  pm2 start ecosystem.config.cjs  (then `pm2 save`)
 *
 * USChed keeps ISMIS sign-in sessions and running search jobs in server memory, so it MUST run as exactly one
 * process: leave `instances: 1` and `exec_mode: 'fork'`. Cluster mode would give each worker its own session
 * table and sign students out at random.
 *
 * Secrets: put them in the server's environment or a .env file next to this one (Next.js loads it), not here.
 */
module.exports = {
  apps: [
    {
      name: 'usched',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        // Behind HTTPS (recommended): also set UCHED_CONSENT_SECRET and UCHED_IP_SALT or the server refuses to start.
        // UCHED_REQUIRE_HTTPS: 'true',
      },
    },
  ],
}
