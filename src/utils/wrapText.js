export const wrapText = (ctx, text, maxWidth) => {
  const lines = [];
  const manualLines = text.split('\n');

  manualLines.forEach(line => {
    if (ctx.measureText(line).width <= maxWidth) {
      lines.push(line);
    } else {
      const words = line.split(' ');
      let currentLine = '';

      words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = ctx.measureText(testLine).width;

        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else if (currentLine) {
          lines.push(currentLine);
          currentLine = word;

          if (ctx.measureText(word).width > maxWidth) {
            let charLine = '';
            for (let i = 0; i < word.length; i += 1) {
              const testChar = charLine + word[i];
              if (ctx.measureText(testChar).width <= maxWidth) {
                charLine = testChar;
              } else {
                if (charLine) {
                  lines.push(charLine);
                }
                charLine = word[i];
              }
            }
            if (charLine) {
              lines.push(charLine);
            }
            currentLine = '';
          }
        } else {
          let charLine = '';
          for (let i = 0; i < word.length; i += 1) {
            const testChar = charLine + word[i];
            if (ctx.measureText(testChar).width <= maxWidth) {
              charLine = testChar;
            } else {
              if (charLine) {
                lines.push(charLine);
              }
              charLine = word[i];
            }
          }
          if (charLine) {
            lines.push(charLine);
          }
        }
      });

      if (currentLine) {
        lines.push(currentLine);
      }
    }
  });

  return lines;
};
