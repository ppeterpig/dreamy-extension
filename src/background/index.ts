chrome.runtime.onMessage.addListener(
  (
    message: { type: string },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: { apiKey: string }) => void,
  ) => {
    if (message.type === 'GET_API_KEY') {
      chrome.storage.local.get('dreamy_settings').then((result) => {
        const settings = result.dreamy_settings as { apiKey?: string } | undefined;
        sendResponse({ apiKey: settings?.apiKey ?? '' });
      });
      return true;
    }
  },
);
