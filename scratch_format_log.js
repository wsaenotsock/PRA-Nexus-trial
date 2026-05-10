const fs = require('fs');
const path = require('path');

const inputFile = String.raw`C:\Users\User\.gemini\antigravity\brain\f1bcac85-4e67-420c-9618-2386ae4d4094\.system_generated\logs\overview.txt`;
const outputFile = String.raw`C:\Users\User\.gemini\antigravity\brain\aa7b7437-be91-406c-8ce7-81ff3f93cf45\scratch\past_conversation_history.md`;

const dir = path.dirname(outputFile);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

try {
    const content = fs.readFileSync(inputFile, 'utf8');
    const lines = content.split('\n');
    let md = '# 過去の会話ログ: Verifying Server-Side Calculation\n\n';
    md += '> 元のセッションID: `f1bcac85-4e67-420c-9618-2386ae4d4094`\n\n---\n\n';

    lines.forEach(line => {
        if (!line.trim()) return;
        try {
            const data = JSON.parse(line);
            let role = data.type === 'USER_INPUT' ? '👤 **USER**' : '🤖 **ASSISTANT**';
            let text = data.content || '';

            if (data.type === 'USER_INPUT') {
                const match = text.match(/<USER_REQUEST>\s*([\s\S]*?)\s*<\/USER_REQUEST>/);
                if (match) text = match[1];
            }

            const toolCalls = data.tool_calls || [];
            
            if (!text && toolCalls.length === 0) return;

            md += `### ${role}\n\n`;
            if (text) md += text.trim() + '\n\n';
            
            if (toolCalls.length > 0) {
                md += '*[Tool Calls]*\n';
                toolCalls.forEach(tc => {
                    md += `- \`${tc.name}\` (${JSON.stringify(tc.args).slice(0,100)}${JSON.stringify(tc.args).length > 100 ? '...' : ''})\n`;
                });
                md += '\n';
            }
            md += '---\n\n';
        } catch(e) {
            // skip bad JSON
        }
    });

    fs.writeFileSync(outputFile, md, 'utf8');
    console.log("Done writing to:", outputFile);
} catch (err) {
    console.error("Error reading/writing:", err);
}
