
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      throw new Error("Telegram není nastaven.");
    }

    const data = JSON.parse(event.body || "{}");

    if (!data.photo || !data.answers || !Array.isArray(data.answers)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Chybí fotka nebo odpovědi." })
      };
    }

    const imageBuffer = Buffer.from(
      data.photo.replace(/^data:image\/jpeg;base64,/, ""),
      "base64"
    );

    if (imageBuffer.length > 9 * 1024 * 1024) {
      return {
        statusCode: 413,
        body: JSON.stringify({ error: "Fotka je příliš velká." })
      };
    }

    const form = new FormData();
    form.append(
      "chat_id",
      chatId
    );
    form.append(
      "photo",
      new Blob([imageBuffer], { type: "image/jpeg" }),
      "selfie.jpg"
    );
    form.append(
      "caption",
      "💜 NOVÝ VÝSLEDEK KVÍZU CO JE LEPŠÍ?\n" +
      "Počet otázek: " + data.count + "\n" +
      "Datum: " + data.date
    );

    const photoResponse = await fetch(
      `https://api.telegram.org/bot${token}/sendPhoto`,
      { method: "POST", body: form }
    );

    const photoResult = await photoResponse.json();

    if (!photoResult.ok) {
      throw new Error("Telegram odmítl odeslat fotku.");
    }

    let message = "💜 ODPOVĚDI Z KVÍZU\n\n";

    data.answers.forEach((item, index) => {
      message += (index + 1) + ". " + item.question +
        "\n➡️ " + item.answer + "\n\n";
    });

    const chunks = message.match(/[\s\S]{1,3500}/g) || [];

    for (const chunk of chunks) {
      const response = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: chunk
          })
        }
      );

      const result = await response.json();

      if (!result.ok) {
        throw new Error("Nepodařilo se odeslat odpovědi.");
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Odeslání se nepodařilo." })
    };
  }
};
