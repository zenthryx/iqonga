-- Add default content templates for long-form content generation
-- These templates match the UI shown in the Dashboard

-- Insert default system templates if they don't already exist
INSERT INTO content_series_templates (user_id, name, description, category, framework_type, is_system_template, template_structure)
SELECT * FROM (VALUES
  -- Before/After/Bridge Framework
  (
    CAST(NULL AS INTEGER),
    'Before/After/Bridge',
    'Current state → Desired state → Solution',
    'framework',
    'BeforeAfterBridge',
    true,
    '{
      "sections": [
        {
          "name": "Before (Current State)",
          "prompt": "Describe the current state or problem. What is the situation now? What challenges exist?"
        },
        {
          "name": "After (Desired State)",
          "prompt": "Describe the desired state or goal. What would the ideal situation look like? What benefits would this bring?"
        },
        {
          "name": "Bridge (Solution)",
          "prompt": "Explain the solution or path from current state to desired state. How do we get from Before to After? What steps, tools, or strategies are needed?"
        }
      ]
    }'::jsonb
  ),
  
  -- AIDA Framework
  (
    CAST(NULL AS INTEGER),
    'AIDA Framework',
    'Attention, Interest, Desire, Action - Classic marketing framework',
    'framework',
    'AIDA',
    true,
    '{
      "sections": [
        {
          "name": "Attention",
          "prompt": "Create a compelling hook that grabs the reader''s attention immediately. Use a surprising fact, question, or statement."
        },
        {
          "name": "Interest",
          "prompt": "Build interest by providing valuable information, insights, or addressing the reader''s needs and pain points."
        },
        {
          "name": "Desire",
          "prompt": "Create desire by highlighting benefits, showing success stories, or demonstrating how the solution improves their situation."
        },
        {
          "name": "Action",
          "prompt": "Include a clear, compelling call-to-action that tells the reader exactly what to do next."
        }
      ]
    }'::jsonb
  ),
  
  -- StoryBrand Framework
  (
    CAST(NULL AS INTEGER),
    'StoryBrand Framework',
    'Character, Problem, Guide, Plan, Success - Story-driven marketing',
    'framework',
    'StoryBrand',
    true,
    '{
      "sections": [
        {
          "name": "Character (Hero)",
          "prompt": "Introduce the main character (your audience/customer). Who are they? What do they want?"
        },
        {
          "name": "Problem",
          "prompt": "Identify the problem or challenge the character faces. What obstacles stand in their way?"
        },
        {
          "name": "Guide",
          "prompt": "Position yourself or your solution as the guide who helps the character. Show empathy and authority."
        },
        {
          "name": "Plan",
          "prompt": "Present a clear plan or solution. What steps will help the character overcome the problem?"
        },
        {
          "name": "Success",
          "prompt": "Paint a picture of success. What does life look like after the problem is solved? What transformation occurs?"
        }
      ]
    }'::jsonb
  ),
  
  -- PAS Framework
  (
    CAST(NULL AS INTEGER),
    'PAS Framework',
    'Problem, Agitate, Solve - Effective problem-solving structure',
    'framework',
    'PAS',
    true,
    '{
      "sections": [
        {
          "name": "Problem",
          "prompt": "Clearly identify and describe the problem your audience faces. Be specific and relatable."
        },
        {
          "name": "Agitate",
          "prompt": "Agitate the problem by exploring its consequences, pain points, and impact. Make the problem feel urgent and important."
        },
        {
          "name": "Solve",
          "prompt": "Present your solution clearly. Show how it addresses the problem and alleviates the pain points identified."
        }
      ]
    }'::jsonb
  ),
  
  -- Listicle Format
  (
    CAST(NULL AS INTEGER),
    'Listicle',
    'Top 10, Best of, Ultimate Guide format',
    'format',
    'Listicle',
    true,
    '{
      "sections": [
        {
          "name": "Introduction",
          "prompt": "Create an engaging introduction that explains what the listicle covers and why it''s valuable. Hook the reader with a compelling opening."
        },
        {
          "name": "List Items",
          "prompt": "Create numbered list items (e.g., Top 10, Best 5, etc.). Each item should be substantial with clear explanations, examples, or insights. Make each point valuable and actionable."
        },
        {
          "name": "Conclusion",
          "prompt": "Summarize the key takeaways from the list. Provide a final thought or call-to-action that encourages engagement."
        }
      ]
    }'::jsonb
  ),
  
  -- How-To Guide Format
  (
    CAST(NULL AS INTEGER),
    'How-To Guide',
    'Step-by-step instructional content',
    'format',
    'HowTo',
    true,
    '{
      "sections": [
        {
          "name": "Introduction",
          "prompt": "Introduce the topic and explain what the reader will learn. Set expectations and highlight the benefits of following this guide."
        },
        {
          "name": "Prerequisites",
          "prompt": "List any prerequisites, tools, materials, or knowledge needed before starting. Help readers prepare properly."
        },
        {
          "name": "Step-by-Step Instructions",
          "prompt": "Provide clear, detailed, step-by-step instructions. Number each step, explain what to do, why it''s important, and what to expect. Include tips and warnings where relevant."
        },
        {
          "name": "Troubleshooting",
          "prompt": "Address common issues or problems readers might encounter. Provide solutions and workarounds."
        },
        {
          "name": "Conclusion",
          "prompt": "Summarize what was accomplished. Provide next steps or additional resources. Encourage practice or further learning."
        }
      ]
    }'::jsonb
  )
) AS v(user_id, name, description, category, framework_type, is_system_template, template_structure)
WHERE NOT EXISTS (
  SELECT 1 FROM content_series_templates 
  WHERE framework_type = v.framework_type 
    AND is_system_template = true
);

-- Verify templates were created
SELECT 
  name, 
  framework_type, 
  category,
  is_system_template
FROM content_series_templates 
WHERE is_system_template = true 
  AND category IN ('framework', 'format')
ORDER BY category, name;
