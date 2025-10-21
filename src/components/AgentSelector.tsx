import { Agent } from '../types'

interface AgentSelectorProps {
  agents: Agent[]
  currentAgentId: string
  onSelectAgent: (agentId: string) => void
  disabled?: boolean
}

export default function AgentSelector({ 
  agents, 
  currentAgentId, 
  onSelectAgent,
  disabled = false 
}: AgentSelectorProps) {
  return (
    <div className="agent-selector">
      <label>智能体：</label>
      <select 
        value={currentAgentId} 
        onChange={e => onSelectAgent(e.target.value)}
        disabled={disabled}
      >
        {agents.map(agent => (
          <option key={agent.id} value={agent.id}>
            {agent.name}
          </option>
        ))}
      </select>
    </div>
  )
}
