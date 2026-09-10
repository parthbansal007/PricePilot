# AWS Monitoring and Budgets

## CloudWatch
1. All stdout/stderr logs from App Runner are automatically sent to CloudWatch Logs.
2. In AWS Console, go to **CloudWatch** -> **Log groups**.
3. Find the group starting with `/aws/apprunner/`.
4. You can search logs for errors related to Price Tracking, Gemini API, or SerpApi.

## AWS Budgets
1. Go to AWS Billing Dashboard -> **Budgets**.
2. Click **Create budget**.
3. Choose **Cost budget** and set your threshold (e.g., $10/month).
4. Configure an alert to email you when you exceed 80% of your budget.
