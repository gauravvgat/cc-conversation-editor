import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { Project } from '../../../types'

const CLAUDE_DIR = path.join(os.homedir(), '.claude', 'projects')

export async function GET(): Promise<NextResponse<Project[]>> {
  try {
    const projectDirs = await fs.readdir(CLAUDE_DIR)
    const projects: Project[] = []
    
    for (const dir of projectDirs) {
      try {
        const projectPath = path.join(CLAUDE_DIR, dir)
        const stats = await fs.stat(projectPath)
        
        if (stats.isDirectory()) {
          const files = await fs.readdir(projectPath)
          const jsonlFiles = files.filter(file => file.endsWith('.jsonl'))
          
          projects.push({
            name: dir.replace(/^-/, '').replace(/-/g, '/'),
            path: dir,
            conversationCount: jsonlFiles.length
          })
        }
      } catch (error) {
        console.error(`Error reading project ${dir}:`, error)
      }
    }
    
    return NextResponse.json(projects.sort((a, b) => a.name.localeCompare(b.name)))
  } catch (error) {
    console.error('Error loading projects:', error)
    return NextResponse.json({ error: 'Failed to load projects' }, { status: 500 })
  }
}