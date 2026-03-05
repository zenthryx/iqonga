import React, { useState } from 'react';
import { Plus, Trash2, Bell, Mail, Webhook, X } from 'lucide-react';

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  condition: {
    metric: 'sentiment' | 'mentions' | 'engagement' | 'influencer_activity';
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    value: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: ('in_app' | 'email' | 'webhook')[];
  webhookUrl?: string;
  cooldownMinutes: number;
  logicOperator?: 'AND' | 'OR';
  secondCondition?: {
    metric: 'sentiment' | 'mentions' | 'engagement' | 'influencer_activity';
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    value: number;
  };
}

interface AlertRulesConfigProps {
  rules: AlertRule[];
  onChange: (rules: AlertRule[]) => void;
}

const AlertRulesConfig: React.FC<AlertRulesConfigProps> = ({ rules, onChange }) => {
  const [showAddRule, setShowAddRule] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  const addRule = () => {
    const newRule: AlertRule = {
      id: `rule-${Date.now()}`,
      name: 'New Alert Rule',
      enabled: true,
      condition: {
        metric: 'sentiment',
        operator: '>',
        value: 5.0,
      },
      severity: 'medium',
      channels: ['in_app'],
      cooldownMinutes: 15,
    };
    onChange([...rules, newRule]);
    setEditingRule(newRule);
    setShowAddRule(false);
  };

  const updateRule = (id: string, updates: Partial<AlertRule>) => {
    onChange(rules.map(rule => rule.id === id ? { ...rule, ...updates } : rule));
  };

  const deleteRule = (id: string) => {
    if (confirm('Are you sure you want to delete this alert rule?')) {
      onChange(rules.filter(rule => rule.id !== id));
    }
  };

  const toggleRule = (id: string) => {
    updateRule(id, { enabled: !rules.find(r => r.id === id)?.enabled });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alert Rules
        </h3>
        <button
          onClick={addRule}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="bg-gray-700 rounded-lg p-6 text-center">
          <Bell className="h-12 w-12 mx-auto mb-3 text-gray-500" />
          <p className="text-gray-400 mb-4">No alert rules configured</p>
          <button
            onClick={addRule}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
          >
            Create Your First Alert Rule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`bg-gray-700 rounded-lg p-4 border ${
                rule.enabled ? 'border-green-500/30' : 'border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => toggleRule(rule.id)}
                    className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={rule.name}
                    onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                    className="flex-1 px-3 py-1.5 bg-gray-600 border border-gray-500 rounded text-white text-sm font-medium"
                    placeholder="Rule name"
                  />
                  <select
                    value={rule.severity}
                    onChange={(e) => updateRule(rule.id, { severity: e.target.value as any })}
                    className="px-3 py-1.5 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Condition */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <select
                  value={rule.condition.metric}
                  onChange={(e) => updateRule(rule.id, {
                    condition: { ...rule.condition, metric: e.target.value as any }
                  })}
                  className="px-3 py-1.5 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                >
                  <option value="sentiment">Sentiment Score</option>
                  <option value="mentions">Mention Count</option>
                  <option value="engagement">Engagement Rate</option>
                  <option value="influencer_activity">Influencer Activity</option>
                </select>
                <select
                  value={rule.condition.operator}
                  onChange={(e) => updateRule(rule.id, {
                    condition: { ...rule.condition, operator: e.target.value as any }
                  })}
                  className="px-3 py-1.5 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                >
                  <option value=">">Greater than</option>
                  <option value="<">Less than</option>
                  <option value=">=">Greater or equal</option>
                  <option value="<=">Less or equal</option>
                  <option value="==">Equal to</option>
                  <option value="!=">Not equal to</option>
                </select>
                <input
                  type="number"
                  step="0.1"
                  value={rule.condition.value}
                  onChange={(e) => updateRule(rule.id, {
                    condition: { ...rule.condition, value: parseFloat(e.target.value) || 0 }
                  })}
                  className="px-3 py-1.5 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                />
                <button
                  onClick={() => {
                    if (rule.secondCondition) {
                      updateRule(rule.id, { secondCondition: undefined, logicOperator: undefined });
                    } else {
                      updateRule(rule.id, {
                        logicOperator: 'AND',
                        secondCondition: {
                          metric: 'mentions',
                          operator: '>',
                          value: 10,
                        }
                      });
                    }
                  }}
                  className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 border border-gray-500 rounded text-white text-sm"
                >
                  {rule.secondCondition ? 'Remove Condition' : 'Add Condition'}
                </button>
              </div>

              {/* Second Condition */}
              {rule.secondCondition && (
                <div className="grid grid-cols-4 gap-2 mb-3 pl-6 border-l-2 border-blue-500">
                  <select
                    value={rule.logicOperator}
                    onChange={(e) => updateRule(rule.id, { logicOperator: e.target.value as 'AND' | 'OR' })}
                    className="px-3 py-1.5 bg-gray-600 border border-gray-500 rounded text-white text-sm font-semibold"
                  >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                  <select
                    value={rule.secondCondition.metric}
                    onChange={(e) => updateRule(rule.id, {
                      secondCondition: { ...rule.secondCondition!, metric: e.target.value as any }
                    })}
                    className="px-3 py-1.5 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                  >
                    <option value="sentiment">Sentiment Score</option>
                    <option value="mentions">Mention Count</option>
                    <option value="engagement">Engagement Rate</option>
                    <option value="influencer_activity">Influencer Activity</option>
                  </select>
                  <select
                    value={rule.secondCondition.operator}
                    onChange={(e) => updateRule(rule.id, {
                      secondCondition: { ...rule.secondCondition!, operator: e.target.value as any }
                    })}
                    className="px-3 py-1.5 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                  >
                    <option value=">">Greater than</option>
                    <option value="<">Less than</option>
                    <option value=">=">Greater or equal</option>
                    <option value="<=">Less or equal</option>
                    <option value="==">Equal to</option>
                    <option value="!=">Not equal to</option>
                  </select>
                  <input
                    type="number"
                    step="0.1"
                    value={rule.secondCondition.value}
                    onChange={(e) => updateRule(rule.id, {
                      secondCondition: { ...rule.secondCondition!, value: parseFloat(e.target.value) || 0 }
                    })}
                    className="px-3 py-1.5 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                  />
                </div>
              )}

              {/* Channels & Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Notification Channels</label>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={rule.channels.includes('in_app')}
                        onChange={(e) => {
                          const channels: ('in_app' | 'email' | 'webhook')[] = e.target.checked
                            ? [...rule.channels, 'in_app'] as ('in_app' | 'email' | 'webhook')[]
                            : rule.channels.filter(c => c !== 'in_app') as ('in_app' | 'email' | 'webhook')[];
                          updateRule(rule.id, { channels });
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-300">In-App</span>
                    </label>
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={rule.channels.includes('email')}
                        onChange={(e) => {
                          const channels: ('in_app' | 'email' | 'webhook')[] = e.target.checked
                            ? [...rule.channels, 'email'] as ('in_app' | 'email' | 'webhook')[]
                            : rule.channels.filter(c => c !== 'email') as ('in_app' | 'email' | 'webhook')[];
                          updateRule(rule.id, { channels });
                        }}
                        className="w-4 h-4"
                      />
                      <Mail className="h-3 w-3 text-gray-300" />
                      <span className="text-gray-300">Email</span>
                    </label>
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={rule.channels.includes('webhook')}
                        onChange={(e) => {
                          const channels: ('in_app' | 'email' | 'webhook')[] = e.target.checked
                            ? [...rule.channels, 'webhook'] as ('in_app' | 'email' | 'webhook')[]
                            : rule.channels.filter(c => c !== 'webhook') as ('in_app' | 'email' | 'webhook')[];
                          updateRule(rule.id, { channels });
                        }}
                        className="w-4 h-4"
                      />
                      <Webhook className="h-3 w-3 text-gray-300" />
                      <span className="text-gray-300">Webhook</span>
                    </label>
                  </div>
                  {rule.channels.includes('webhook') && (
                    <input
                      type="url"
                      value={rule.webhookUrl || ''}
                      onChange={(e) => updateRule(rule.id, { webhookUrl: e.target.value })}
                      placeholder="Webhook URL"
                      className="w-full mt-2 px-3 py-1.5 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Cooldown (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={rule.cooldownMinutes}
                    onChange={(e) => updateRule(rule.id, { cooldownMinutes: parseInt(e.target.value) || 15 })}
                    className="w-full px-3 py-1.5 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Prevent alert spam</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertRulesConfig;


