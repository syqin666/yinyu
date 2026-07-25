import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' 让构建产物用相对路径，可直接以 file:// 打开
export default defineConfig({
  base: './',
  plugins: [react()],
})
