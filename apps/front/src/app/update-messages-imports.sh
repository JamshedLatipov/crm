#!/bin/bash
echo "🔄 Updating imports from 'notifications' to 'messages'..."

# Update all TypeScript imports in the entire frontend
find . -type f -name "*.ts" -exec sed -i '' "s|from './notifications/|from './messages/|g" {} \;
find . -type f -name "*.ts" -exec sed -i '' "s|from '../notifications/|from '../messages/|g" {} \;
find . -type f -name "*.ts" -exec sed -i '' "s|from '../../notifications/|from '../../messages/|g" {} \;
find . -type f -name "*.ts" -exec sed -i '' "s|from '../../../notifications/|from '../../../messages/|g" {} \;
find . -type f -name "*.ts" -exec sed -i '' "s|@crm/front/app/notifications/|@crm/front/app/messages/|g" {} \;

# Update route paths
find . -type f -name "*.routes.ts" -exec sed -i '' "s|path: 'notifications'|path: 'messages'|g" {} \;

# Update loadChildren paths
find . -type f -name "*.ts" -exec sed -i '' "s|loadChildren: () => import('./notifications/|loadChildren: () => import('./messages/|g" {} \;

echo "✅ Import updates complete!"

# Show summary
echo "📝 Files with 'messages' imports:"
find . -type f -name "*.ts" -exec grep -l "from.*messages/" {} \; | head -20
