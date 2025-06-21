// DOM Elements
const inputText = document.getElementById('input-text');
const reader = document.getElementById('reader');
const readingMode = document.getElementById('reading-mode');
const fontSize = document.getElementById('font-size');

// ReadGraph elements
const inputTextGraph = document.getElementById('input-text-graph');
const graphContainer = document.getElementById('graph-container');
const sentenceProgress = document.getElementById('sentence-progress');

// Tab elements
const tabBtns = document.querySelectorAll('.tab-btn');
const readflowMode = document.getElementById('readflow-mode');
const readgraphMode = document.getElementById('readgraph-mode');

// App state
let currentMode = 'readflow';
let sentences = [];
let currentSentenceIndex = 0;

// Initialize when DOM and libraries are ready
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', switchMode);
    });

    // ReadFlow events
    inputText.addEventListener('input', updateReader);
    inputText.addEventListener('paste', () => {
        setTimeout(updateReader, 10);
    });

    readingMode.addEventListener('change', () => {
        reader.className = `reader-content reading-mode-${readingMode.value}`;
    });

    fontSize.addEventListener('input', () => {
        reader.style.fontSize = `${fontSize.value}px`;
    });

    // ReadGraph events
    inputTextGraph.addEventListener('input', updateGraphText);
    inputTextGraph.addEventListener('paste', () => {
        setTimeout(updateGraphText, 10);
    });

    // Keyboard navigation for ReadGraph
    document.addEventListener('keydown', handleKeyNavigation);
}

function switchMode(e) {
    const mode = e.target.dataset.mode;
    currentMode = mode;

    // Update tab buttons
    tabBtns.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    // Switch mode content
    if (mode === 'readflow') {
        readflowMode.style.display = 'block';
        readgraphMode.style.display = 'none';
    } else {
        readflowMode.style.display = 'none';
        readgraphMode.style.display = 'block';
        // Sync text between modes
        if (inputText.value && !inputTextGraph.value) {
            inputTextGraph.value = inputText.value;
            updateGraphText();
        }
    }
}

function updateReader() {
    const text = inputText.value.trim();
    if (!text) {
        reader.innerHTML = '<p style="color: #9ca3af; text-align: center; margin-top: 150px;">Your highlighted text will appear here...</p>';
        return;
    }
    
    // Simply insert the HTML content
    reader.innerHTML = text;
}

// ReadGraph functionality
function updateGraphText() {
    const text = inputTextGraph.value.trim();
    if (!text) {
        sentences = [];
        currentSentenceIndex = 0;
        updateSentenceDisplay();
        return;
    }

    // Extract sentences using Compromise
    sentences = extractSentences(text);
    currentSentenceIndex = 0;
    updateSentenceDisplay();
}

function extractSentences(text) {
    // Use simple sentence splitting based on sentence-ending punctuation
    return simpleSentenceSplit(text);
}

function simpleSentenceSplit(text) {
    // Split HTML by periods/punctuation, then parse each chunk
    const sentenceHtmlChunks = text.split(/(?<=[.!?])\s+/);
    const sentences = [];
    
    console.log('Raw HTML chunks:', sentenceHtmlChunks.length);
    
    sentenceHtmlChunks.forEach((htmlChunk, index) => {
        if (htmlChunk.trim()) {
            console.log(`Raw HTML chunk ${index + 1}:`, htmlChunk.trim());
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlChunk.trim();
            
            const chunks = Array.from(tempDiv.querySelectorAll('.ct-chunk'));
            console.log(`Found ${chunks.length} chunks in sentence ${index + 1}`);
            
            if (chunks.length > 0) {
                const sentence = chunks.map((chunk, chunkIndex) => {
                    const classes = chunk.className.split(' ');
                    const ctType = classes.find(cls => cls.startsWith('ct-') && cls !== 'ct-chunk');
                    console.log(`Chunk ${chunkIndex} classes:`, classes, 'Selected type:', ctType);
                    return {
                        text: chunk.textContent.trim(),
                        type: ctType || 'ct-chunk',  // fallback to ct-chunk if no specific type found
                        element: chunk.outerHTML
                    };
                });
                
                sentences.push(sentence);
                console.log(`Sentence ${index + 1}:`, sentence.map(chunk => `${chunk.text} (${chunk.type})`).join(' | '));
            }
        }
    });
    
    console.log('Extracted sentences:', sentences.length);
    return sentences;
}

function findSentenceMarkup(htmlText, sentenceText) {
    // Simple approach: find the sentence text in the HTML and extract surrounding markup
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlText;
    
    // Find text nodes that contain parts of our sentence
    const walker = document.createTreeWalker(
        tempDiv,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    const sentenceWords = sentenceText.toLowerCase().split(/\s+/);
    const chunks = [];
    
    // Extract ct-chunks that contain sentence words
    tempDiv.querySelectorAll('.ct-chunk').forEach(chunk => {
        const chunkText = chunk.textContent.toLowerCase().trim();
        if (sentenceWords.some(word => chunkText.includes(word))) {
            chunks.push({
                text: chunk.textContent.trim(),
                type: chunk.className.split(' ').find(cls => cls.startsWith('ct-')),
                element: chunk.outerHTML
            });
        }
    });
    
    return chunks.length > 0 ? chunks : null;
}

function updateSentenceDisplay() {
    if (sentences.length === 0) {
        graphContainer.innerHTML = '<p style="color: #9ca3af; text-align: center; margin-top: 150px;">Your sentence graph will appear here...</p>';
        sentenceProgress.textContent = '0 / 0';
        return;
    }
    
    sentenceProgress.textContent = `${currentSentenceIndex + 1} / ${sentences.length}`;
    renderSentenceGraph(sentences[currentSentenceIndex]);
}

function renderSentenceGraph(sentence) {
    // Clear previous content
    graphContainer.innerHTML = '';
    
    if (!sentence || sentence.length === 0) return;
    
    console.log('Rendering sentence with chunks:', sentence.length);
    sentence.forEach((chunk, i) => {
        console.log(`Chunk ${i}:`, chunk.text, `(${chunk.type})`);
    });
    
    const width = graphContainer.clientWidth - 32; // Account for padding
    const height = graphContainer.clientHeight - 32;
    
    // Create SVG
    const svg = d3.select(graphContainer)
        .append('svg')
        .attr('class', 'graph-svg')
        .attr('width', width)
        .attr('height', height);
    
    // Build hierarchy data
    const hierarchyData = buildHierarchy(sentence);
    console.log('Hierarchy data:', hierarchyData);
    
    if (!hierarchyData) {
        console.error('No hierarchy data generated');
        return;
    }
    
    // Create tree layout
    const treeLayout = d3.tree()
        .size([width - 100, height - 100]);
    
    const root = d3.hierarchy(hierarchyData);
    treeLayout(root);
    
    console.log('Tree nodes:', root.descendants().length);
    console.log('Tree root:', root.data);
    console.log('Tree children:', root.children?.length || 0);
    
    // Draw links
    svg.selectAll('.graph-link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', 'graph-link')
        .attr('d', d3.linkVertical()
            .x(d => d.x + 50)
            .y(d => d.y + 50));
    
    // Draw nodes
    const nodes = svg.selectAll('.graph-node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', d => `graph-node ${d.data.type || ''}`)
        .attr('transform', d => `translate(${d.x + 50}, ${d.y + 50})`);
    
    // Add rectangles
    nodes.append('rect')
        .attr('class', 'graph-node-rect')
        .attr('width', d => Math.max(80, d.data.text.length * 8))
        .attr('height', 30)
        .attr('x', d => -Math.max(40, d.data.text.length * 4))
        .attr('y', -15);
    
    // Add text
    nodes.append('text')
        .text(d => d.data.text)
        .attr('dy', '0.35em');
}

function buildHierarchy(sentence) {
    if (!sentence || sentence.length === 0) return null;
    
    // Create a linear representation that maintains order but shows dependencies
    const mainVerb = sentence.find(chunk => chunk.type === 'ct-verb-phrase');
    const mainVerbIndex = sentence.findIndex(chunk => chunk.type === 'ct-verb-phrase');
    
    if (!mainVerb) {
        // If no main verb, create a simple linear tree
        return buildLinearTree(sentence);
    }
    
    const root = {
        text: mainVerb.text,
        type: mainVerb.type,
        children: []
    };
    
    // Process chunks in sentence order, building dependencies
    sentence.forEach((chunk, index) => {
        if (chunk === mainVerb) return; // Skip the main verb itself
        
        if (index < mainVerbIndex) {
            // Elements before the verb (usually subjects, modifiers of subject)
            const node = {
                text: chunk.text,
                type: chunk.type,
                children: []
            };
            
            // Check if this modifies the previous element
            if (chunk.type === 'ct-prep-phrase' && root.children.length > 0) {
                // Prepositional phrases often modify the previous noun
                const lastChild = root.children[root.children.length - 1];
                lastChild.children.push(node);
            } else {
                root.children.push(node);
            }
        } else {
            // Elements after the verb (objects, complements, etc.)
            const node = {
                text: chunk.text,
                type: chunk.type,
                children: []
            };
            
            // Check for dependencies
            if (chunk.type === 'ct-prep-phrase' && root.children.length > 0) {
                // See if this prepositional phrase modifies the last added element
                const candidates = root.children.filter(child => 
                    child.type === 'ct-object' || 
                    child.type === 'ct-indirect-object' ||
                    child.type === 'ct-subject'
                );
                
                if (candidates.length > 0) {
                    const lastCandidate = candidates[candidates.length - 1];
                    lastCandidate.children.push(node);
                } else {
                    root.children.push(node);
                }
            } else if (chunk.type === 'ct-modifier' && root.children.length > 0) {
                // Modifiers often modify the previous element
                const lastChild = root.children[root.children.length - 1];
                if (lastChild.type === 'ct-verb-phrase' || lastChild.type === 'ct-object') {
                    lastChild.children.push(node);
                } else {
                    root.children.push(node);
                }
            } else {
                root.children.push(node);
            }
        }
    });
    
    return root;
}

function buildLinearTree(sentence) {
    // Create a simple left-to-right tree for sentences without clear verb structure
    if (sentence.length === 0) return null;
    
    const root = {
        text: sentence[0].text,
        type: sentence[0].type,
        children: []
    };
    
    let current = root;
    
    for (let i = 1; i < sentence.length; i++) {
        const node = {
            text: sentence[i].text,
            type: sentence[i].type,
            children: []
        };
        
        // Prepositional phrases and modifiers become children of the previous element
        if ((sentence[i].type === 'ct-prep-phrase' || sentence[i].type === 'ct-modifier') && 
            current.children.length === 0) {
            current.children.push(node);
            current = node; // Continue building from this branch
        } else {
            // Add as sibling to root
            root.children.push(node);
            current = node;
        }
    }
    
    return root;
}

function handleKeyNavigation(e) {
    if (currentMode !== 'readgraph' || sentences.length === 0) return;
    
    if (e.code === 'Space') {
        e.preventDefault();
        nextSentence();
    } else if (e.code === 'Backspace') {
        e.preventDefault();
        previousSentence();
    }
}

function nextSentence() {
    if (currentSentenceIndex < sentences.length - 1) {
        currentSentenceIndex++;
        updateSentenceDisplay();
    }
}

function previousSentence() {
    if (currentSentenceIndex > 0) {
        currentSentenceIndex--;
        updateSentenceDisplay();
    }
}