import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 3000, // Set your desired port here
    allowedHosts: ['localhost', 'diploma-ui.9uyone.pp.ua']
  },
  preview: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 8080 // Set port for the production preview server
  }
})
