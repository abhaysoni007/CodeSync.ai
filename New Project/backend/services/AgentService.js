import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Agent Service - AI-powered autonomous agent
 * Can create/edit/delete files and run terminal commands
 */

class AgentService {
  constructor() {
    this.logs = [];
  }

  /**
   * Add log entry
   */
  log(type, message) {
    const logEntry = {
      type,
      message,
      timestamp: new Date().toISOString()
    };
    this.logs.push(logEntry);
    console.log(`[AGENT ${type.toUpperCase()}]`, message);
  }

  /**
   * Clear logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Get Gemini AI to analyze task and create action plan
   */
  async planTask(apiKey, command, model = 'gemini-2.0-flash-exp') {
    this.log('info', '🧠 Analyzing task with Gemini AI...');

    const genAI = new GoogleGenerativeAI(apiKey);
    
    const systemPrompt = `You are an autonomous coding agent for a React + Vite project. Your job is to analyze user commands and create a detailed action plan.

**Project Structure:**
- Frontend: React + Vite + Tailwind CSS
- Components should go in: components/[ComponentName].jsx
- Pages should go in: pages/[PageName].jsx
- Use functional components with hooks
- Use Tailwind CSS for styling
- Include PropTypes

**Your Capabilities:**
1. CREATE_FILE - Create new files with content
2. EDIT_FILE - Modify existing files  
3. DELETE_FILE - Delete files
4. RUN_COMMAND - Execute terminal commands (needs permission)

**Response Format (JSON only, no markdown):**
{
  "taskUnderstanding": "Brief description of what user wants",
  "plan": [
    {
      "action": "CREATE_FILE",
      "target": "components/ComponentName.jsx",
      "content": "complete React component code here",
      "reason": "why this step is needed",
      "needsPermission": false
    }
  ],
  "summary": "Overall task summary"
}

**Important Rules:**
- For components: target = "components/Navbar.jsx" (not src/components)
- For pages: target = "pages/Home.jsx" (not src/pages)
- Provide COMPLETE, working React code with all imports
- Use Tailwind CSS classes for styling
- Include PropTypes validation
- For RUN_COMMAND, set needsPermission: true
- DO NOT include markdown code blocks in content
- Files will be created in auto_generated folder automatically`;

    const geminiModel = genAI.getGenerativeModel({ 
      model: model,
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.3, // Lower for more deterministic planning
        maxOutputTokens: 4000,
      }
    });

    const result = await geminiModel.generateContent(`User Command: ${command}

Create a detailed action plan to accomplish this task. Respond with ONLY valid JSON, no markdown formatting.`);
    
    const response = await result.response;
    let text = response.text();

    // Clean response - remove markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const plan = JSON.parse(text);
      this.log('success', `✅ Created plan with ${plan.plan.length} steps`);
      return plan;
    } catch (error) {
      this.log('error', `❌ Failed to parse AI plan: ${error.message}`);
      throw new Error('AI returned invalid plan format');
    }
  }

  /**
   * Execute a single action step
   */
  async executeAction(action, projectRoot) {
    const { action: actionType, target, content, reason } = action;

    this.log('info', `📝 ${actionType}: ${target}`);
    this.log('info', `   Reason: ${reason}`);

    // Ensure project root exists
    try {
      await fs.mkdir(projectRoot, { recursive: true });
    } catch (error) {
      // Ignore if already exists
    }

    switch (actionType) {
      case 'CREATE_FILE': {
        const filePath = path.join(projectRoot, target);
        const dir = path.dirname(filePath);
        
        // Create directory if doesn't exist
        await fs.mkdir(dir, { recursive: true });
        
        // Write file
        await fs.writeFile(filePath, content, 'utf8');
        
        this.log('success', `✅ Created: ${target}`);
        return { success: true, file: target, action: 'created' };
      }

      case 'EDIT_FILE': {
        const filePath = path.join(projectRoot, target);
        
        // Check if file exists
        try {
          await fs.access(filePath);
        } catch {
          throw new Error(`File not found: ${target}`);
        }
        
        // Write updated content
        await fs.writeFile(filePath, content, 'utf8');
        
        this.log('success', `✅ Edited: ${target}`);
        return { success: true, file: target, action: 'edited' };
      }

      case 'DELETE_FILE': {
        const filePath = path.join(projectRoot, target);
        
        // Delete file
        await fs.unlink(filePath);
        
        this.log('success', `✅ Deleted: ${target}`);
        return { success: true, file: target, action: 'deleted' };
      }

      case 'READ_FILE': {
        const filePath = path.join(projectRoot, target);
        
        // Read file
        const fileContent = await fs.readFile(filePath, 'utf8');
        
        this.log('success', `✅ Read: ${target} (${fileContent.length} chars)`);
        return { success: true, file: target, action: 'read', content: fileContent };
      }

      case 'RUN_COMMAND': {
        // Execute command
        const { stdout, stderr } = await execAsync(target, { cwd: projectRoot });
        
        if (stderr) {
          this.log('warning', `⚠️ Command stderr: ${stderr}`);
        }
        
        this.log('success', `✅ Executed: ${target}`);
        return { 
          success: true, 
          command: target, 
          action: 'executed',
          output: stdout,
          error: stderr 
        };
      }

      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }

  /**
   * Execute full agent task
   */
  async executeTask(apiKey, command, projectRoot, model = 'gemini-2.0-flash-exp') {
    this.clearLogs();
    this.log('info', `🤖 Agent Mode activated`);
    this.log('info', `📋 Task: ${command}`);

    try {
      // Step 1: Create action plan using Gemini
      const plan = await this.planTask(apiKey, command, model);

      // Step 2: Separate actions that need permission
      const immediateActions = plan.plan.filter(a => !a.needsPermission);
      const permissionActions = plan.plan.filter(a => a.needsPermission);

      const results = {
        taskUnderstanding: plan.taskUnderstanding,
        summary: plan.summary,
        filesCreated: [],
        filesModified: [],
        filesDeleted: [],
        commandsToRun: [],
        executedActions: [],
        pendingPermissions: []
      };

      // Step 3: Execute immediate actions (file operations)
      this.log('info', `⚡ Executing ${immediateActions.length} immediate actions...`);
      
      for (const action of immediateActions) {
        try {
          const result = await this.executeAction(action, projectRoot);
          results.executedActions.push(result);

          // Track file operations
          if (result.action === 'created') results.filesCreated.push(result.file);
          if (result.action === 'edited') results.filesModified.push(result.file);
          if (result.action === 'deleted') results.filesDeleted.push(result.file);

        } catch (error) {
          this.log('error', `❌ Action failed: ${error.message}`);
          throw error;
        }
      }

      // Step 4: Prepare permission requests for commands
      if (permissionActions.length > 0) {
        this.log('info', `🔐 ${permissionActions.length} actions require user permission`);
        results.pendingPermissions = permissionActions.map(a => ({
          action: a.action,
          target: a.target,
          reason: a.reason,
          content: a.content
        }));
      }

      // Add logs to results
      results.logs = this.logs;

      this.log('success', `✅ Task completed!`);
      return results;

    } catch (error) {
      this.log('error', `❌ Task failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute a pending permission action
   */
  async executePermissionAction(action, projectRoot) {
    this.clearLogs();
    this.log('info', `🔓 Executing approved action: ${action.action}`);

    try {
      const result = await this.executeAction(action, projectRoot);
      
      return {
        success: true,
        result,
        logs: this.logs
      };
    } catch (error) {
      this.log('error', `❌ Execution failed: ${error.message}`);
      throw error;
    }
  }
}

export default new AgentService();
