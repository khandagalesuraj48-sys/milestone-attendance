import { schedule } from '@netlify/functions';
import { schedulerService } from '../../server/services/schedulerService';

// Netlify Scheduled Function running hourly to process auto sign-outs for abandoned shifts
export const handler = schedule('0 * * * *', async () => {
  try {
    const dayResult = await schedulerService.runDayShiftAutoSignOut();
    const nightResult = await schedulerService.runNightShiftAutoSignOut();

    console.log(
      `[Netlify Scheduled Function] Auto sign-out processed: ${dayResult.processedCount} day session(s), ${nightResult.processedCount} night session(s).`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        dayShiftProcessed: dayResult.processedCount,
        nightShiftProcessed: nightResult.processedCount,
      }),
    };
  } catch (err: any) {
    console.error('[Netlify Scheduled Function] Error executing auto-signout job:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: err.message || 'Auto sign-out job failed',
      }),
    };
  }
});
