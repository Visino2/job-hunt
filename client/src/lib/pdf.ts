import { jsPDF } from 'jspdf'

// Plain-text cover letter -> a simple single-column PDF. Word-wraps each
// paragraph to the page width and paginates automatically for long letters.
export function downloadTextAsPdf(text: string, filename: string) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })

  const marginLeft = 56
  const marginTop = 72
  const bottomMargin = 56
  const lineHeight = 16
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const maxWidth = pageWidth - marginLeft * 2

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(11)

  let y = marginTop
  const paragraphs = text.split('\n')

  for (const paragraph of paragraphs) {
    const lines = paragraph.length > 0 ? doc.splitTextToSize(paragraph, maxWidth) : ['']
    for (const line of lines) {
      if (y > pageHeight - bottomMargin) {
        doc.addPage()
        y = marginTop
      }
      doc.text(line, marginLeft, y)
      y += lineHeight
    }
    y += lineHeight * 0.5
  }

  doc.save(filename)
}
