#!/bin/bash
echo "🔄 Replacing NotificationChannel with MessageChannel in notifications module..."

# Replace in TypeScript files
find . -type f -name "*.ts" -exec sed -i '' 's/: NotificationChannel\[\]/: MessageChannel[]/g' {} \;
find . -type f -name "*.ts" -exec sed -i '' 's/: NotificationChannel;/: MessageChannel;/g' {} \;
find . -type f -name "*.ts" -exec sed -i '' 's/: NotificationChannel,/: MessageChannel,/g' {} \;
find . -type f -name "*.ts" -exec sed -i '' 's/: NotificationChannel)/: MessageChannel)/g' {} \;
find . -type f -name "*.ts" -exec sed -i '' 's/<NotificationChannel,/<MessageChannel,/g' {} \;
find . -type f -name "*.ts" -exec sed -i '' 's/Record<NotificationChannel/Record<MessageChannel/g' {} \;
find . -type f -name "*.ts" -exec sed -i '' 's/import.*NotificationChannel.*from.*notification\.models/import { MessageChannel } from '\''\.\.\/\.\.\/\.\.\/models\/notification\.models'\''/g' {} \;

# Update imports that include NotificationChannel
find . -type f -name "*.ts" -exec sed -i '' 's/NotificationChannel,/MessageChannel,/g' {} \;
find . -type f -name "*.ts" -exec sed -i '' 's/, NotificationChannel/, MessageChannel/g' {} \;

echo "✅ Replacement complete!"

# Show modified files
echo "📝 Files modified:"
find . -type f -name "*.ts" -exec grep -l "MessageChannel" {} \;
