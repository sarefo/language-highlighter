const inputText = document.getElementById('input-text');
const reader = document.getElementById('reader');
const readingMode = document.getElementById('reading-mode');
const fontSize = document.getElementById('font-size');

// Update reader content when input changes
inputText.addEventListener('input', updateReader);
inputText.addEventListener('paste', () => {
    setTimeout(updateReader, 10);
});

// Update reading mode
readingMode.addEventListener('change', () => {
    reader.className = `reader-content reading-mode-${readingMode.value}`;
});

// Update font size
fontSize.addEventListener('input', () => {
    reader.style.fontSize = `${fontSize.value}px`;
});

function updateReader() {
    const text = inputText.value.trim();
    if (!text) {
        reader.innerHTML = '<p style="color: #9ca3af; text-align: center; margin-top: 150px;">Your highlighted text will appear here...</p>';
        return;
    }
    
    // Simply insert the HTML content
    reader.innerHTML = text;
}