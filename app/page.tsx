'use client';

import { useState } from 'react';
import { analyzeSlopContent, getSlopRating, getSlopColor, SlopAnalysis } from '@/lib/slopDetector';

export default function Home() {
  const [inputType, setInputType] = useState<'text' | 'youtube'>('text');
  const [textContent, setTextContent] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<SlopAnalysis | null>(null);
  const [error, setError] = useState('');

  const handleAnalyzeText = () => {
    if (!textContent.trim()) {
      setError('Please enter some text to analyze');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const result = analyzeSlopContent(textContent);
      setAnalysis(result);
    } catch (err) {
      setError('Failed to analyze content');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeYouTube = async () => {
    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      // Fetch transcript from YouTube
      const response = await fetch('/api/youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: youtubeUrl }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transcript');
      }
      
      // Analyze the transcript
      const result = analyzeSlopContent(data.text);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch YouTube transcript');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = () => {
    if (inputType === 'text') {
      handleAnalyzeText();
    } else {
      handleAnalyzeYouTube();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black py-8 px-4">
      <main className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">
            🔍 Slop Detector
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Analyze content for low-effort, repetitive, AI-generated, or spammy characteristics
          </p>
        </div>

        {/* Input Type Selector */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => {
                setInputType('text');
                setAnalysis(null);
                setError('');
              }}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
                inputType === 'text'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
              }`}
            >
              📝 Text Content
            </button>
            <button
              onClick={() => {
                setInputType('youtube');
                setAnalysis(null);
                setError('');
              }}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
                inputType === 'youtube'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
              }`}
            >
              🎥 YouTube URL
            </button>
          </div>

          {/* Input Area */}
          {inputType === 'text' ? (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Enter text to analyze:
              </label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste your content here..."
                className="w-full h-64 p-4 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Enter YouTube URL:
              </label>
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full p-4 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                The video must have captions/transcripts available
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full mt-6 py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-zinc-400 disabled:to-zinc-500 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            {loading ? '🔄 Analyzing...' : '🔍 Analyze Content'}
          </button>
        </div>

        {/* Results */}
        {analysis && (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
              Analysis Results
            </h2>

            {/* Overall Score */}
            <div className="mb-8 p-6 bg-gradient-to-r from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
                  Overall Slop Score
                </span>
                <span className={`text-4xl font-bold ${getSlopColor(analysis.score)}`}>
                  {analysis.score}/100
                </span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full ${
                    analysis.score >= 80
                      ? 'bg-red-600'
                      : analysis.score >= 60
                      ? 'bg-orange-500'
                      : analysis.score >= 40
                      ? 'bg-yellow-500'
                      : analysis.score >= 20
                      ? 'bg-blue-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${analysis.score}%` }}
                />
              </div>
              <p className="mt-3 text-xl font-semibold text-center text-zinc-800 dark:text-zinc-200">
                {getSlopRating(analysis.score)}
              </p>
            </div>

            {/* Factor Breakdown */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                Factor Breakdown
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(analysis.factors).map(([key, value]) => (
                  <div key={key} className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {value}/100
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full ${
                          value >= 70 ? 'bg-red-500' : value >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Details */}
            {analysis.details.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                  Detected Issues
                </h3>
                <ul className="space-y-2">
                  {analysis.details.map((detail, index) => (
                    <li
                      key={index}
                      className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-zinc-700 dark:text-zinc-300 flex items-start gap-2"
                    >
                      <span className="text-yellow-600 dark:text-yellow-500 mt-1">⚠️</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
