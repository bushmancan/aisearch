/**
 * Revenue Experts AI Analyzer Widget
 * Standalone JavaScript widget for WordPress integration
 */

(function() {
    'use strict';

    // Widget namespace
    window.RexAnalyzer = window.RexAnalyzer || {};

    /**
     * Widget initialization function
     * @param {Object} config - Widget configuration
     */
    window.RexAnalyzer.init = function(config) {
        const defaultConfig = {
            containerId: 'rex-analyzer-widget',
            apiBase: 'https://rex-geo-seo-analyzer.replit.app/api',
            theme: {
                primaryColor: '#25165C',
                secondaryColor: '#6366F1',
                fontFamily: 'system-ui, -apple-system, sans-serif'
            },
            branding: {
                title: 'AI Website Visibility Audit',
                subtitle: 'Analyze your website\'s visibility in AI search results'
            },
            analytics: {
                enabled: false
            }
        };

        const settings = Object.assign({}, defaultConfig, config);
        const container = document.getElementById(settings.containerId);

        if (!container) {
            console.error('RexAnalyzer: Container element not found:', settings.containerId);
            return;
        }

        // Track widget load
        if (settings.analytics.enabled) {
            trackEvent('Widget Loaded');
        }

        // Create widget HTML
        const widgetHTML = `
            <div class="rex-analyzer-widget" style="font-family: ${settings.theme.fontFamily};">
                <style>
                    .rex-analyzer-widget {
                        max-width: 1200px;
                        width: 100%;
                        margin: 0 auto;
                        padding: 32px;
                        border-radius: 12px;
                        background: #ffffff;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    }
                    
                    /* Responsive design for different screen sizes */
                    @media (min-width: 1400px) {
                        .rex-analyzer-widget {
                            max-width: 1400px;
                            padding: 40px;
                        }
                        .rex-widget-title {
                            font-size: 32px;
                        }
                        .rex-input-container {
                            gap: 16px;
                        }
                        .rex-url-input, .rex-analyze-btn {
                            font-size: 18px;
                            padding: 16px 20px;
                        }
                    }
                    
                    @media (min-width: 1200px) and (max-width: 1399px) {
                        .rex-analyzer-widget {
                            max-width: 1200px;
                            padding: 36px;
                        }
                        .rex-widget-title {
                            font-size: 30px;
                        }
                    }
                    
                    @media (min-width: 992px) and (max-width: 1199px) {
                        .rex-analyzer-widget {
                            max-width: 960px;
                            padding: 32px;
                        }
                    }
                    
                    @media (min-width: 768px) and (max-width: 991px) {
                        .rex-analyzer-widget {
                            max-width: 720px;
                            padding: 28px;
                        }
                    }
                    
                    @media (max-width: 767px) {
                        .rex-analyzer-widget {
                            margin: 10px;
                            padding: 20px;
                        }
                        .rex-widget-title {
                            font-size: 24px;
                        }
                        .rex-input-container {
                            flex-direction: column;
                        }
                        .rex-validate-btn {
                            width: 100%;
                            margin-top: 8px;
                        }
                    }
                    .rex-widget-header {
                        text-align: center;
                        margin-bottom: 32px;
                    }
                    .rex-widget-title {
                        font-size: 28px;
                        font-weight: 700;
                        color: ${settings.theme.primaryColor};
                        margin-bottom: 8px;
                    }
                    .rex-widget-subtitle {
                        font-size: 16px;
                        color: #6b7280;
                        line-height: 1.5;
                    }
                    .rex-form-group {
                        margin-bottom: 24px;
                    }
                    .rex-form-label {
                        display: block;
                        font-size: 14px;
                        font-weight: 600;
                        color: #374151;
                        margin-bottom: 8px;
                    }
                    .rex-input-container {
                        display: flex;
                        gap: 12px;
                        align-items: flex-start;
                    }
                    .rex-url-input {
                        flex: 1;
                        padding: 12px 16px;
                        border: 2px solid #e5e7eb;
                        border-radius: 8px;
                        font-size: 16px;
                        transition: border-color 0.2s, box-shadow 0.2s;
                    }
                    .rex-url-input:focus {
                        outline: none;
                        border-color: ${settings.theme.primaryColor};
                        box-shadow: 0 0 0 3px rgba(37, 22, 92, 0.1);
                    }
                    .rex-validate-btn {
                        padding: 12px 16px;
                        background: #f3f4f6;
                        border: 2px solid #e5e7eb;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .rex-validate-btn:hover {
                        background: #e5e7eb;
                    }
                    .rex-validate-btn:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                    .rex-analyze-btn {
                        width: 100%;
                        padding: 16px 24px;
                        background: ${settings.theme.primaryColor};
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    }
                    .rex-analyze-btn:hover:not(:disabled) {
                        background: ${adjustColor(settings.theme.primaryColor, -20)};
                    }
                    .rex-analyze-btn:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                    .rex-validation-status {
                        margin-top: 8px;
                        padding: 8px 12px;
                        border-radius: 6px;
                        font-size: 14px;
                    }
                    .rex-status-valid {
                        background: #d1fae5;
                        color: #065f46;
                        border: 1px solid #a7f3d0;
                    }
                    .rex-status-invalid {
                        background: #fee2e2;
                        color: #991b1b;
                        border: 1px solid #fca5a5;
                    }
                    .rex-status-validating {
                        background: #dbeafe;
                        color: #1e40af;
                        border: 1px solid #93c5fd;
                    }
                    .rex-loading {
                        text-align: center;
                        padding: 40px 20px;
                    }
                    .rex-spinner {
                        width: 32px;
                        height: 32px;
                        border: 3px solid #f3f4f6;
                        border-top: 3px solid ${settings.theme.primaryColor};
                        border-radius: 50%;
                        animation: rex-spin 1s linear infinite;
                        margin: 0 auto 16px;
                    }
                    @keyframes rex-spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    .rex-error {
                        background: #fee2e2;
                        color: #991b1b;
                        padding: 16px;
                        border-radius: 8px;
                        border: 1px solid #fca5a5;
                        margin-top: 16px;
                    }
                    .rex-results {
                        margin-top: 32px;
                        padding-top: 32px;
                        border-top: 2px solid #e5e7eb;
                    }
                </style>
                
                <div class="rex-widget-header">
                    <h2 class="rex-widget-title">${settings.branding.title}</h2>
                    <p class="rex-widget-subtitle">${settings.branding.subtitle}</p>
                </div>

                <form class="rex-analysis-form">
                    <div class="rex-form-group">
                        <label class="rex-form-label" for="rex-url-input">Website URL</label>
                        <div class="rex-input-container">
                            <input 
                                type="url" 
                                id="rex-url-input"
                                class="rex-url-input" 
                                placeholder="https://www.example.com"
                                value="https://"
                                required
                            />
                            <button type="button" class="rex-validate-btn" title="Validate website accessibility">
                                🌐
                            </button>
                        </div>
                        <div class="rex-validation-status" style="display: none;"></div>
                    </div>

                    <button type="submit" class="rex-analyze-btn">
                        Analyze Website
                    </button>
                </form>

                <div class="rex-results-container"></div>
            </div>
        `;

        container.innerHTML = widgetHTML;

        // Initialize widget functionality
        initializeWidget(container, settings);
    };

    /**
     * Initialize widget functionality
     */
    function initializeWidget(container, settings) {
        const form = container.querySelector('.rex-analysis-form');
        const urlInput = container.querySelector('.rex-url-input');
        const validateBtn = container.querySelector('.rex-validate-btn');
        const analyzeBtn = container.querySelector('.rex-analyze-btn');
        const validationStatus = container.querySelector('.rex-validation-status');
        const resultsContainer = container.querySelector('.rex-results-container');

        let validationState = 'idle';

        // URL input validation
        urlInput.addEventListener('input', function() {
            const url = this.value.trim();
            validationState = 'idle';
            validationStatus.style.display = 'none';
            
            // Enable validate button only if URL looks valid
            validateBtn.disabled = !url || url === 'https://' || !isValidUrl(url);
        });

        // Website validation
        validateBtn.addEventListener('click', async function() {
            const url = urlInput.value.trim();
            if (!url || !isValidUrl(url)) return;

            validationState = 'validating';
            validateBtn.disabled = true;
            showValidationStatus('validating', 'Checking website accessibility...');

            try {
                const response = await fetch(`${settings.apiBase}/validate-url`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });

                const result = await response.json();

                if (result.valid) {
                    validationState = 'valid';
                    showValidationStatus('valid', '✓ Website is accessible and ready for analysis');
                } else {
                    validationState = 'invalid';
                    showValidationStatus('invalid', `✗ ${result.error || 'Website is not accessible'}`);
                }
            } catch (error) {
                validationState = 'invalid';
                showValidationStatus('invalid', '✗ Unable to validate website - please try again');
            } finally {
                validateBtn.disabled = false;
            }
        });

        // Form submission
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const url = urlInput.value.trim();
            if (!url || !isValidUrl(url)) {
                showError('Please enter a valid URL');
                return;
            }

            // Track analysis start
            if (settings.analytics.enabled) {
                trackEvent('Analysis Started', { url: url });
            }

            showLoading();
            
            try {
                const response = await fetch(`${settings.apiBase}/analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Analysis failed');
                }

                const result = await response.json();
                showResults(result);

                // Track analysis completion
                if (settings.analytics.enabled) {
                    trackEvent('Analysis Completed', { 
                        url: url, 
                        score: result.results?.overallScore 
                    });
                }
            } catch (error) {
                showError(error.message);
                console.error('Analysis error:', error);
            }
        });

        function showValidationStatus(type, message) {
            validationStatus.className = `rex-validation-status rex-status-${type}`;
            validationStatus.textContent = message;
            validationStatus.style.display = 'block';
        }

        function showLoading() {
            resultsContainer.innerHTML = `
                <div class="rex-loading">
                    <div class="rex-spinner"></div>
                    <p>Analyzing website... This typically takes 30-60 seconds.</p>
                </div>
            `;
        }

        function showError(message) {
            resultsContainer.innerHTML = `
                <div class="rex-error">
                    <strong>Analysis Error:</strong> ${message}
                </div>
            `;
        }

        function showResults(result) {
            // Create simplified results display
            const score = result.results?.overallScore || 0;
            const scoreColor = score >= 75 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
            
            resultsContainer.innerHTML = `
                <div class="rex-results">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <div style="font-size: 48px; font-weight: bold; color: ${scoreColor};">
                            ${score}/100
                        </div>
                        <div style="font-size: 18px; color: #6b7280; margin-top: 8px;">
                            Overall AI Visibility Score
                        </div>
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="${window.location.origin}/getseenanalyzer/?url=${encodeURIComponent(result.url)}" 
                           style="display: inline-block; padding: 12px 24px; background: ${settings.theme.primaryColor}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                            View Detailed Report
                        </a>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Utility functions
     */
    function isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }

    function adjustColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    function trackEvent(eventName, data = {}) {
        // Google Analytics tracking
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, data);
        }
        
        // Console logging for debugging
        console.log('RexAnalyzer Event:', eventName, data);
    }

})();