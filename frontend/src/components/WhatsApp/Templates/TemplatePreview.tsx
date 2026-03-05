import React, { useState } from 'react';
import { WhatsAppTemplate } from '../../../types/whatsapp';

interface TemplatePreviewProps {
  template: WhatsAppTemplate;
  sampleVariables?: Record<string, string>;
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({ template, sampleVariables = {} }) => {
  const [variables, setVariables] = useState<Record<string, string>>(sampleVariables);

  // Extract variable numbers from template text
  const extractVariables = (text: string): string[] => {
    const variablePattern = /\{\{(\d+)\}\}/g;
    const matches = text.match(variablePattern);
    if (!matches) return [];
    return Array.from(new Set(matches)).map(match => match.replace(/\{\{|\}\}/g, ''));
  };

  // Replace variables in text
  const replaceVariables = (text: string): string => {
    let result = text;
    Object.keys(variables).forEach((key) => {
      const placeholder = `{{${key}}}`;
      const escapedPlaceholder = placeholder.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
      const regex = new RegExp(escapedPlaceholder, 'g');
      result = result.replace(regex, variables[key] || placeholder);
    });
    return result;
  };

  const variableNumbers = template.body_text ? extractVariables(template.body_text) : [];

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-xl font-semibold text-white mb-4">Template Preview</h3>
      
      {/* Variable Inputs */}
      {variableNumbers.length > 0 && (
        <div className="mb-4 space-y-2">
          <label className="block text-white font-medium mb-2">Sample Variables</label>
          {variableNumbers.map((num) => (
            <div key={num} className="flex items-center gap-2">
              <label className="text-gray-400 text-sm w-20">Variable {num}:</label>
              <input
                type="text"
                value={variables[num] || ''}
                onChange={(e) => setVariables({ ...variables, [num]: e.target.value })}
                placeholder={`Sample value ${num}`}
                className="flex-1 bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
              />
            </div>
          ))}
        </div>
      )}

      {/* WhatsApp Message Preview */}
      <div className="bg-[#e5ddd5] rounded-lg p-4 max-w-sm mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
          {/* Header */}
          {template.header_type && template.header_content && (
            <div className="border-b border-gray-200 pb-3">
              {template.header_type === 'TEXT' && (
                <div className="text-gray-800 font-medium">{template.header_content}</div>
              )}
              {template.header_type === 'IMAGE' && (
                <div className="bg-gray-200 rounded h-32 flex items-center justify-center text-gray-500 text-sm">
                  [Image: {template.header_content}]
                </div>
              )}
              {template.header_type === 'VIDEO' && (
                <div className="bg-gray-200 rounded h-32 flex items-center justify-center text-gray-500 text-sm">
                  [Video: {template.header_content}]
                </div>
              )}
              {template.header_type === 'DOCUMENT' && (
                <div className="bg-gray-200 rounded h-16 flex items-center justify-center text-gray-500 text-sm">
                  [Document: {template.header_content}]
                </div>
              )}
            </div>
          )}

          {/* Body */}
          {template.body_text && (
            <div className="text-gray-800 text-sm whitespace-pre-wrap">
              {replaceVariables(template.body_text)}
            </div>
          )}

          {/* Footer */}
          {template.footer_text && (
            <div className="text-gray-600 text-xs border-t border-gray-200 pt-3">
              {template.footer_text}
            </div>
          )}

          {/* Buttons */}
          {template.buttons && template.buttons.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-gray-200">
              {template.buttons.map((button, idx) => (
                <div key={idx}>
                  {button.type === 'QUICK_REPLY' && (
                    <button className="w-full bg-blue-500 text-white text-xs py-2 px-3 rounded hover:bg-blue-600 transition-colors">
                      {button.text}
                    </button>
                  )}
                  {button.type === 'URL' && (
                    <a
                      href={button.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full bg-green-500 text-white text-xs py-2 px-3 rounded hover:bg-green-600 transition-colors text-center"
                    >
                      {button.text}
                    </a>
                  )}
                  {button.type === 'PHONE_NUMBER' && (
                    <a
                      href={`tel:${button.phoneNumber}`}
                      className="block w-full bg-purple-500 text-white text-xs py-2 px-3 rounded hover:bg-purple-600 transition-colors text-center"
                    >
                      {button.text}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Template Info */}
      <div className="mt-4 text-sm text-gray-400 space-y-1">
        <div>Category: {template.category}</div>
        <div>Language: {template.language}</div>
        <div>Status: {template.status}</div>
      </div>
    </div>
  );
};

export default TemplatePreview;
