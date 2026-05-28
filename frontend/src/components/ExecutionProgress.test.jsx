import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ExecutionProgress from './ExecutionProgress'

describe('ExecutionProgress', () => {
  it('renders ordered execution steps returned by the backend', () => {
    render(
      <ExecutionProgress
        mode="demo"
        steps={['校验执行模式', '生成模拟订单', '返回演示结果']}
      />
    )

    expect(screen.getByRole('status', { name: '执行进度' })).toBeInTheDocument()
    expect(screen.getByText('校验执行模式')).toBeInTheDocument()
    expect(screen.getByText('生成模拟订单')).toBeInTheDocument()
    expect(screen.getByText('返回演示结果')).toBeInTheDocument()
  })
})
