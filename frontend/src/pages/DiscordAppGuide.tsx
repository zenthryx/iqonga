import React from 'react';

const DiscordAppGuide: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-6">Create Your Discord App (BYO Bot)</h1>
        <p className="text-gray-300 mb-8">Follow these steps to create your own Discord bot and connect it to Ajentrix.</p>

        <ol className="space-y-6 list-decimal list-inside text-gray-300">
          <li>
            Go to <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300">Discord Developer Portal</a> and click <span className="text-white font-semibold">New Application</span>.
          </li>
          <li>
            Open your application → <span className="text-white font-semibold">Bot</span> → click <span className="text-white font-semibold">Add Bot</span>. Copy the <span className="text-white font-semibold">Token</span> and the <span className="text-white font-semibold">Application ID (client_id)</span>.
          </li>
          <li>
            Under <span className="text-white font-semibold">Privileged Gateway Intents</span>, turn ON <span className="text-white font-semibold">Message Content Intent</span>. Keep Presence and Server Members OFF.
          </li>
          <li>
            In Ajentrix → Discord page, paste your Token to connect. Enter your <span className="text-white font-semibold">client_id</span> in the generator to create the invite URL, then invite the bot to your server.
          </li>
          <li>
            Ensure your bot role or channel overrides allow: View Channel, Read Message History, Send Messages, Embed Links, Attach Files, Use External Emojis.
          </li>
          <li>
            Use <span className="text-white font-semibold">/help</span> and <span className="text-white font-semibold">/about</span> to confirm commands are working.
          </li>
        </ol>

        <div className="mt-10 p-4 rounded-lg bg-gray-800 border border-gray-700">
          <h2 className="text-xl text-white font-semibold mb-3">Troubleshooting</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-2">
            <li>Missing Access: verify channel permissions and role order.</li>
            <li>Commands not showing: wait a few minutes for global command propagation, or reconnect.</li>
            <li>Bot offline after restart: our auto-reconnect will restore; click Reconnect if needed.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DiscordAppGuide;


