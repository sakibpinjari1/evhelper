# MongoDB Atlas Setup Guide

## Step 1: Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account (if you don't have one)
3. Create a new project

## Step 2: Create a Cluster
1. Click "Build a Cluster" or "Create"
2. Choose the **FREE tier** (M0 Sandbox)
3. Select your preferred cloud provider and region (choose closest to your location)
4. Click "Create Cluster" (takes 3-5 minutes to provision)

## Step 3: Create Database User
1. In the left sidebar, click "Database Access"
2. Click "Add New Database User"
3. Choose "Password" authentication method
4. Enter a username and password (save these - you'll need them!)
5. For "Database User Privileges", select "Read and write to any database"
6. Click "Add User"

## Step 4: Configure Network Access
1. In the left sidebar, click "Network Access"
2. Click "Add IP Address"
3. For development, you can click "Allow Access from Anywhere" (0.0.0.0/0)
   - **Note**: For production, restrict this to your server's IP address
4. Click "Confirm"

## Step 5: Get Connection String
1. Go back to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Node.js" as the driver and version 4.1 or later
5. Copy the connection string (it looks like):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## Step 6: Update Your .env File
1. Open `server/.env` file
2. Replace the `MONGODB_URI` value with your connection string:
   ```
   MONGODB_URI=mongodb+srv://your_username:your_password@cluster0.xxxxx.mongodb.net/ev_charging?retryWrites=true&w=majority
   ```
3. **Important**: 
   - Replace `<username>` with your database username
   - Replace `<password>` with your database password
   - Add `/ev_charging` before the `?` to specify the database name
   - If your password contains special characters, you need to URL encode them:
     - `@` becomes `%40`
     - `:` becomes `%3A`
     - `/` becomes `%2F`
     - `+` becomes `%2B`
     - `%` becomes `%25`

## Step 7: Test Connection
1. Save your `.env` file
2. Restart your server:
   ```bash
   cd server
   npm run dev
   ```
3. You should see: `MongoDB connected: cluster0-shard-00-00.xxxxx.mongodb.net`

## Common Issues

### "Bad auth: Authentication failed"
- Double-check your username and password
- Make sure you're using the database user credentials (not your Atlas account password)
- URL encode special characters in your password

### "Connection timeout"
- Check Network Access settings in Atlas
- Make sure your IP address is allowed
- Try "Allow Access from Anywhere" for testing

### "MongoServerError: user is not allowed to do action"
- Make sure your database user has "Read and write to any database" privileges
- Go to Database Access and edit user permissions

## Security Best Practices

### For Production:
1. **Never commit `.env` file** - Already added to `.gitignore`
2. **Use strong passwords** - Mix of uppercase, lowercase, numbers, and symbols
3. **Restrict IP access** - Only allow your server's IP address
4. **Rotate credentials** - Change passwords regularly
5. **Use environment variables** - Store in secure environment variable managers
6. **Enable monitoring** - Set up Atlas alerts for unusual activity

### Additional Security:
- Consider using MongoDB Atlas's built-in encryption at rest
- Enable audit logs in Atlas for compliance
- Use separate database users for different applications
- Implement connection pooling limits

## Free Tier Limitations
- 512 MB storage
- Shared RAM
- Shared vCPUs
- Suitable for development and small projects
- Can upgrade anytime if you need more resources

## Useful Atlas Features
- **Monitoring**: View real-time metrics and performance
- **Backups**: Automatic daily backups (available in paid tiers)
- **Charts**: Create visualizations of your data
- **Realm**: Build serverless apps and mobile sync

## Support
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [MongoDB Community Forums](https://www.mongodb.com/community/forums/)
- [MongoDB University](https://university.mongodb.com/) - Free courses
