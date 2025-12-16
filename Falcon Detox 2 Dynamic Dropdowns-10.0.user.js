
// ==UserScript==
// @name         Falcon Detox 2 Dynamic Dropdowns
// @namespace    tampermonkey.net/
// @version      10.0
// @description  Add suggestion dropdown with dynamic options based on radio selection
// @author       Vivek
// @match        na.templates.geostudio.last-mile.amazon.dev/*
// @match        eu.templates.geostudio.last-mile.amazon.dev/*
// @match        fe.templates.geostudio.last-mile.amazon.dev/*
// @match        na.geostudio.last-mile.amazon.dev/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=https://advertising.amazon.com/
// @grant        none
// @downloadURL  https://github.com/VivekYadav1597/Repository1/blob/main/Falcon%20Detox%202%20Dynamic%20Dropdowns-10.0.user.js
// @updateURL    https://github.com/VivekYadav1597/Repository1/blob/main/Falcon%20Detox%202%20Dynamic%20Dropdowns-10.0.user.js
// ==/UserScript==

(function() {
    'use strict';

    console.log('[Dropdown Helper] Script loaded');

    // Map text fields to their corresponding radio button groups
    const fieldConfig = {
        'AIDPIDOMReason': 'AIDPIDOMtype',
        'AIDBPIDOMReason': 'AIDBPIDOMtype',
        'PIDBPIDOMReason': 'PIDBPIDOMtype'
    };

    // Suggestion options based on radio button value
    const suggestionMap = {
        'SPID': [
            'Building',
            'Street',
            'City',
            'Zipcode'
        ],
        'Bldg': [
            'Block number in campus cases',
            'Bldg number missing in AID/PID',
            'AID/PID Bldg not within range of BPID'
        ],
        'Business': [
            'Multiple Businesses at the address',
            'Business in Customer Name Field, Multiple businesses at the address'
        ],
        'Street': [
            'Multiple Streets in AID/PID',
            'Street segments missing'
        ],
        'SubUnit': [
            'Sub Unit missing in PID/AID',
            'Different Sub Unit',
            'Department info in AID'
        ],
        'Other': [],
        'NA': ['NA', 'No Addressline for PID']
    };

    const convertedFields = new Set();
    const suggestionBoxes = {};

    function getSelectedRadioValue(radioGroupName) {
        // Find the section with the radio group name
        const allParagraphs = document.querySelectorAll('p.css-17xh5uu');
        let radioSection = null;

        for (let p of allParagraphs) {
            if (p.textContent.trim() === radioGroupName) {
                radioSection = p.closest('.css-19hedjk');
                break;
            }
        }

        if (!radioSection) {
            console.log(`[Dropdown Helper] Radio section not found for ${radioGroupName}`);
            return 'SPID'; // Default
        }

        // Find checked radio button in this section
        const checkedRadio = radioSection.querySelector('input[type="radio"][aria-checked="true"]');
        if (checkedRadio) {
            console.log(`[Dropdown Helper] Selected radio value: ${checkedRadio.value}`);
            return checkedRadio.value;
        }

        return 'SPID'; // Default
    }

    function updateSuggestionBox(fieldId, suggestionBox) {
        const radioGroupName = fieldConfig[fieldId];
        const selectedValue = getSelectedRadioValue(radioGroupName);
        const options = suggestionMap[selectedValue] || [];

        // Clear existing suggestions
        suggestionBox.innerHTML = '';

        if (options.length === 0) {
            const noOption = document.createElement('div');
            noOption.textContent = 'No suggestions available';
            noOption.style.cssText = `
                padding: 8px 12px;
                font-size: 14px;
                color: #999;
                font-style: italic;
            `;
            suggestionBox.appendChild(noOption);
            return;
        }

        // Create suggestion items
        options.forEach(optionText => {
            const item = document.createElement('div');
            item.textContent = optionText;
            item.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                font-size: 14px;
                border-bottom: 1px solid #f0f0f0;
            `;

            // Hover effect
            item.addEventListener('mouseenter', function() {
                this.style.backgroundColor = '#f5f5f5';
            });
            item.addEventListener('mouseleave', function() {
                this.style.backgroundColor = 'white';
            });

            // Click to select
            item.addEventListener('click', function() {
                const textInput = document.querySelector(`input[data-testid="${fieldId}"]`);
                if (textInput) {
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                        window.HTMLInputElement.prototype,
                        'value'
                    ).set;
                    nativeInputValueSetter.call(textInput, optionText);

                    textInput.dispatchEvent(new Event('input', { bubbles: true }));
                    textInput.dispatchEvent(new Event('change', { bubbles: true }));
                    textInput.dispatchEvent(new Event('blur', { bubbles: true }));

                    console.log(`[Dropdown Helper] Selected "${optionText}" for ${fieldId}`);
                }
                suggestionBox.style.display = 'none';
            });

            suggestionBox.appendChild(item);
        });
    }

    function addSuggestionDropdown(fieldId) {
        if (convertedFields.has(fieldId)) {
            return false;
        }

        const textInput = document.querySelector(`input.css-11lb4kk[data-testid="${fieldId}"], input.css-ax7mdo[data-testid="${fieldId}"]`);

        if (!textInput || textInput.type !== 'text') {
            return false;
        }

        console.log(`[Dropdown Helper] Found text field: ${fieldId}`);

        // Create suggestion dropdown
        const suggestionBox = document.createElement('div');
        suggestionBox.style.cssText = `
            position: absolute;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            z-index: 10000;
            display: none;
            max-height: 200px;
            overflow-y: auto;
            min-width: 200px;
        `;
        suggestionBox.setAttribute('data-suggestion-box', fieldId);

        // Store reference
        suggestionBoxes[fieldId] = suggestionBox;

        // Add to body
        document.body.appendChild(suggestionBox);

        // Position and show dropdown on focus
        textInput.addEventListener('focus', function() {
            // Update suggestions based on current radio selection
            updateSuggestionBox(fieldId, suggestionBox);

            const rect = textInput.getBoundingClientRect();
            suggestionBox.style.top = (rect.bottom + window.scrollY) + 'px';
            suggestionBox.style.left = (rect.left + window.scrollX) + 'px';
            suggestionBox.style.width = rect.width + 'px';
            suggestionBox.style.display = 'block';
        });

        // Hide dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (e.target !== textInput && !suggestionBox.contains(e.target)) {
                suggestionBox.style.display = 'none';
            }
        });

        // Listen for radio button changes
        const radioGroupName = fieldConfig[fieldId];
        document.addEventListener('click', function(e) {
            if (e.target.type === 'radio') {
                // Check if this radio belongs to our group
                const radioSection = e.target.closest('.css-19hedjk');
                if (radioSection) {
                    const sectionTitle = radioSection.querySelector('p.css-17xh5uu');
                    if (sectionTitle && sectionTitle.textContent.trim() === radioGroupName) {
                        console.log(`[Dropdown Helper] Radio changed in ${radioGroupName}, updating suggestions`);
                        // Update the suggestion box if it's currently visible
                        if (suggestionBox.style.display === 'block') {
                            updateSuggestionBox(fieldId, suggestionBox);
                        }
                    }
                }
            }
        });

        convertedFields.add(fieldId);
        console.log(`[Dropdown Helper] ✓ Added suggestion dropdown for ${fieldId}`);
        return true;
    }

    function processFields() {
        console.log('[Dropdown Helper] Processing fields...');
        let processed = 0;

        Object.keys(fieldConfig).forEach(fieldId => {
            if (addSuggestionDropdown(fieldId)) {
                processed++;
            }
        });

        if (processed > 0) {
            console.log(`[Dropdown Helper] ✅ Processed ${processed} field(s)`);
        }
    }

    // Try multiple times to catch dynamically loaded content
    setTimeout(processFields, 1000);
    setTimeout(processFields, 2000);
    setTimeout(processFields, 3500);
    setTimeout(processFields, 5000);

    // Watch for new content
    const observer = new MutationObserver(() => {
        Object.keys(fieldConfig).forEach(fieldId => {
            if (!convertedFields.has(fieldId)) {
                const textInput = document.querySelector(`input[data-testid="${fieldId}"]`);
                if (textInput) {
                    setTimeout(() => processFields(), 500);
                }
            }
        });
    });

    setTimeout(() => {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        console.log('[Dropdown Helper] Observer started');
    }, 100);

})();

