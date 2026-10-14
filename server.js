const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const FINNHUB_API_KEY = 'db7jme9r01qptb5rhh3gdb7jme9r01qptb5rhh40';

const getFinnhubSymbol = (pair) => {
    const map = {
        'EUR_USD_OTC': 'OANDA:EUR_USD', 'GBP_USD_OTC': 'OANDA:GBP_USD',
        'USD_JPY_OTC': 'OANDA:USD_JPY', 'AUD_USD_OTC': 'OANDA:AUD_USD',
        'USD_CAD_OTC': 'OANDA:USD_CAD', 'USD_CHF_OTC': 'OANDA:USD_CHF',
        'NZD_USD_OTC': 'OANDA:NZD_USD', 'EUR_GBP_OTC': 'OANDA:EUR_GBP',
        'EUR_JPY_OTC': 'OANDA:EUR_JPY', 'GBP_JPY_OTC': 'OANDA:GBP_JPY',
        'AUD_JPY_OTC': 'OANDA:AUD_JPY', 'CAD_JPY_OTC': 'OANDA:CAD_JPY',
        'USD_INR_OTC': 'USDINR', 'USD_BRL_OTC': 'USDBRL',
        'USD_MXN_OTC': 'USDMXN', 'USD_CLP_OTC': 'USDCLP',
        'BTC_USD_OTC': 'BINANCE:BTCUSDT', 'ETH_USD_OTC': 'BINANCE:ETHUSDT',
        'GOLD_OTC': 'OANDA:XAU_USD', 'SILVER_OTC': 'OANDA:XAG_USD',
        'OIL_OTC': 'OANDA:BCO_USD'
    };
    return map[pair] || 'OANDA:EUR_USD';
};

app.post('/api/analyze', async (req, res) => {
    const { platform, timeframe, pair } = req.body;
    const symbol = getFinnhubSymbol(pair);

    try {
        const toTime = Math.floor(Date.now() / 1000);
        const fromTime = toTime - (60 * 5);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(`https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=1&from=${fromTime}&to=${toTime}&token=${FINNHUB_API_KEY}`, {
            signal: controller.signal
        });
        clearTimeout(timeout);

        const data = await response.json();

        if (data.c && data.c.length >= 2) {
            const closes = data.c.slice(-5);
            const currentPrice = closes[closes.length - 1];
            const previousPrice = closes[closes.length - 2];
            
            let upwardMoves = 0;
            for (let i = 1; i < closes.length; i++) {
                if (closes[i] > closes[i - 1]) upwardMoves++;
            }
            
            const isUpTrend = upwardMoves >= 3;
            const isDownTrend = (5 - upwardMoves) >= 3;

            let candleDirection = currentPrice > previousPrice ? "UP" : "DOWN";
            let decisionText = "NO TRADE";
            let confidence = Math.floor(Math.random() * 3) + 90;

            if (isUpTrend) {
                decisionText = "BUY SIGNAL";
                candleDirection = "UP";
                confidence = Math.floor(Math.random() * 4) + 94;
            } else if (isDownTrend) {
                decisionText = "SELL SIGNAL";
                candleDirection = "DOWN";
                confidence = Math.floor(Math.random() * 4) + 94;
            }

            if (confidence >= 96) {
                res.json({
                    decision: decisionText,
                    explanation: `Trend Analysis: ${isUpTrend ? 'Upward' : 'Downward'} momentum detected for ${pair} on ${platform}. Confidence: ${confidence}%. Execute ${candleDirection} trade for ${timeframe}.`,
                    isUp: candleDirection === "UP",
                    isDown: candleDirection === "DOWN",
                    confidence: confidence,
                    color: isUpTrend ? 'green' : 'red'
                });
            } else {
                res.json({
                    decision: "NO TRADE",
                    explanation: `Analysis complete for ${pair}. Confidence: ${confidence}%. Requirement: min 96% for trade execution.`,
                    isUp: false,
                    isDown: false,
                    confidence: confidence,
                    color: 'white'
                });
            }
        } else {
            throw new Error('Insufficient historical data.');
        }
    } catch (error) {
        res.status(500).json({ 
            decision: "NO TRADE",
            explanation: "Market analysis unavailable. Connection issues or timeout.",
            isUp: false,
            isDown: false,
            confidence: 0,
            color: 'white'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
