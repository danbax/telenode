const axios = require('axios');

const longPoll = async ({ bot, pollingDelay = 1000, cleanPreviousUpdates = true, url }) => {
    if (pollingDelay < 50) {
        throw new Error('Polling delay must be at least 50ms');
    }
    let offset = 0;
    if (cleanPreviousUpdates) {
        const recentUpdates = await getUpdates(url, -1);
        offset = recentUpdates[0]?.update_id + 1 || 0;
    }

    let attempts = 0;
    const maxAttempts = 5;

    while (bot.useLongPolling) {
        try {
            const updates = await getUpdates(url, offset);
            for (const update of updates) {
                await bot.telenodeHandler(update);
                offset = update.update_id + 1;
            }
            attempts = 0;
        } catch (err) {
            if (err.name === 'AxiosError') {
                console.error('Request error in long polling:\n', err.message, '\n', err.response.data);
                attempts++;
                if (attempts > maxAttempts) {
                    console.log('Max attempts reached, stopping polling...');
                    break;
                }
            } else {
                console.error(err);
            }
        }
        const backoffDelay = attempts > 0 ? Math.min(1000 * (2 ** attempts), 30000) : pollingDelay;
        await sleep(backoffDelay);
    }
    console.log('Long polling stopped...');
};

const getUpdates = async (url, offset) => {
    const res = await axios.get(url + '/getUpdates', { params: { offset } });
    return res.data.result;
};

module.exports = {
    longPoll,
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
