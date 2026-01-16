#!/bin/bash

# Скрипт для массовой замены Notification* → Message* в messages модуле

cd /Users/jamshedlatipov/Documents/work/crm/apps/back/src/app/modules/messages

echo "🔄 Replacing class names..."

# NotificationQueueService → MessageQueueService
find . -type f -name "*.ts" -exec sed -i '' 's/NotificationQueueService/MessageQueueService/g' {} \;
find . -type f -name "*.ts" -exec sed -i '' 's/QueuedNotification/QueuedMessage/g' {} \;

# NotificationWorkerController → MessageWorkerController
find . -type f -name "*.ts" -exec sed -i '' 's/NotificationWorkerController/MessageWorkerController/g' {} \;

# NotificationCampaign → MessageCampaign
find . -type f -name "*.ts" -exec sed -i '' 's/NotificationCampaign/MessageCampaign/g' {} \;
find . -type f -name "*.ts" -exec sed -i '' 's/NotificationChannelType/MessageChannelType/g' {} \;

# Imports paths
find . -type f -name "*.ts" -exec sed -i '' "s/from '.\/entities\/notification-campaign.entity'/from '.\/entities\/message-campaign.entity'/g" {} \;
find . -type f -name "*.ts" -exec sed -i '' "s/from '..\/entities\/notification-campaign.entity'/from '..\/entities\/message-campaign.entity'/g" {} \;
find . -type f -name "*.ts" -exec sed -i '' "s/from '.\/services\/notification-queue.service'/from '.\/services\/message-queue.service'/g" {} \;
find . -type f -name "*.ts" -exec sed -i '' "s/from '..\/services\/notification-queue.service'/from '..\/services\/message-queue.service'/g" {} \;
find . -type f -name "*.ts" -exec sed -i '' "s/from '.\/controllers\/notification-worker.controller'/from '.\/controllers\/message-worker.controller'/g" {} \;
find . -type f -name "*.ts" -exec sed -i '' "s/from '..\/controllers\/notification-worker.controller'/from '..\/controllers\/message-worker.controller'/g" {} \;

# Enum values
find . -type f -name "*.ts" -exec sed -i '' 's/NotificationChannel\./MessageChannel\./g' {} \;

echo "✅ Replacement complete!"
echo "📝 Files modified:"
find . -type f -name "*.ts" -exec echo "  - {}" \;
