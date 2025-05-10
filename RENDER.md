# Deploying MettaModeler to Render

## Prerequisites
- A Render account
- Your code pushed to GitHub
- Python 3.8+ and Node.js 16+ installed on Render

## Deployment Steps

1. **Create a New Web Service**
   - Go to [render.com](https://render.com)
   - Click "New +" and select "Web Service"
   - Connect your GitHub repository

2. **Configure the Service**
   ```
   Name: mettamodeler
   Environment: Node
   Region: Choose closest to your users
   Branch: main
   Build Command: npm run build
   Start Command: chmod +x start.sh && ./start.sh
   ```

3. **Set Environment Variables**
   ```
   NODE_ENV=production
   PORT=3000
   PYTHON_PORT=5050
   API_URL=https://your-render-url.onrender.com
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Render will automatically deploy your app
   - Monitor the logs for any issues

## Monitoring

- **Logs**: Available in the Render dashboard under "Logs"
- **Metrics**: CPU, Memory, and Network usage in the "Metrics" tab
- **Custom Logs**: Check the `logs/` directory in your app for detailed service logs

## Troubleshooting

1. **Service Won't Start**
   - Check the Render logs
   - Verify environment variables
   - Ensure ports are correctly configured

2. **Python Service Issues**
   - Check `logs/python.log`
   - Verify Python dependencies are installed

3. **Frontend Issues**
   - Check `logs/frontend.log`
   - Verify build process completed successfully

## Updating

- Push changes to your main branch
- Render will automatically redeploy
- Monitor the deployment logs for any issues 