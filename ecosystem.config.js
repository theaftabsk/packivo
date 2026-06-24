module.exports = {
  apps: [
    {
      name: "packivo-backend",
      cwd: "./backend",
      script: "npm",
      args: "run start:prod",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "packivo-frontend",
      cwd: "./tenant-app",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
