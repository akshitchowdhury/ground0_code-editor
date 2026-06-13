// Renders the block-based lesson format from src/data/tutorials/*.
// Inline markup supported in paragraphs/list items: `code` and **bold**.

function renderInline(text) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i}>{part.slice(1, -1)}</code>
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

export default function LessonContent({ blocks }) {
  return (
    <div className="lesson">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'h3':
            return <h3 key={i}>{block.text}</h3>
          case 'code':
            return (
              <pre key={i}>
                <code>{block.text}</code>
              </pre>
            )
          case 'list':
            return (
              <ul key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ul>
            )
          default:
            return <p key={i}>{renderInline(block.text)}</p>
        }
      })}
    </div>
  )
}
