const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const PAT = '0e385c2d16594e47b2177300529f2ee4';
const USER_ID = 'clarifai';
const APP_ID = 'main';
const MODEL_ID = 'food-item-recognition';

app.post('/detect', async (req, res) => {
  try {
    const { base64 } = req.body;

    const response = await axios.post(
      `https://api.clarifai.com/v2/models/${MODEL_ID}/outputs`,
      {
        user_app_id: {
          user_id: USER_ID,
          app_id: APP_ID
        },
        inputs: [
          {
            data: {
              image: {
                base64: base64
              }
            }
          }
        ]
      },
      {
        headers: {
          Authorization: `Key ${PAT}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const concepts = response.data.outputs[0].data.concepts.sort(
      (a, b) => b.value - a.value
    );

    const top = concepts[0];

    res.json({
      label: top.name,
      confidence: top.value,
      concepts: concepts
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});


app.get('/recipes', async (req, res) => {
  try {
    const query = req.query.query;

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const searchQuery = `${query} وصفة`;

    const response = await axios.get(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json`
    );

    const data = response.data;

    const results = [];

    // النتائج تكون داخل RelatedTopics
    const topics = data.RelatedTopics || [];

    for (let item of topics) {
      if (item.Text && item.FirstURL) {
        results.push({
          title: item.Text,
          link: item.FirstURL,
        });
      }

      // بعض النتائج nested
      if (item.Topics) {
        for (let sub of item.Topics) {
          if (sub.Text && sub.FirstURL) {
            results.push({
              title: sub.Text,
              link: sub.FirstURL,
            });
          }
        }
      }

      if (results.length >= 5) break;
    }

    res.json(results);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});
