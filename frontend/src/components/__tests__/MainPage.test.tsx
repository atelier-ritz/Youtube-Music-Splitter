import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import MainPage from '../MainPage'

// Mock axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    isAxiosError: vi.fn()
  }
}))
const mockedAxios = vi.mocked(axios)

describe('MainPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the main page with title and input field', () => {
    const mockOnProcessingComplete = vi.fn()
    render(<MainPage onProcessingComplete={mockOnProcessingComplete} />)
    
    expect(screen.getByText('Band Practice Partner')).toBeInTheDocument()
    expect(screen.getByText('Enter a YouTube URL to separate tracks and start practicing')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start Practice' })).toBeInTheDocument()
  })

  it('validates YouTube URLs and shows error for invalid URLs', async () => {
    const user = userEvent.setup()
    const mockOnProcessingComplete = vi.fn()
    render(<MainPage onProcessingComplete={mockOnProcessingComplete} />)
    
    const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
    const form = input.closest('form')!
    
    // Test invalid URL
    await user.type(input, 'not-a-youtube-url')
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(screen.getByText('Invalid YouTube URL format')).toBeInTheDocument()
    })
  })

  it('accepts valid YouTube URLs', async () => {
    const user = userEvent.setup()
    const mockOnProcessingComplete = vi.fn()
    render(<MainPage onProcessingComplete={mockOnProcessingComplete} />)
    
    const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
    const submitButton = screen.getByRole('button', { name: 'Start Practice' })
    
    // Mock successful API response
    mockedAxios.post.mockResolvedValueOnce({
      data: { jobId: 'test-job-id' }
    })
    
    // Test valid YouTube URL
    await user.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await user.click(submitButton)
    
    // Should not show validation error
    expect(screen.queryByText('Invalid YouTube URL format')).not.toBeInTheDocument()
    
    // Should show loading state
    expect(screen.getByText('Processing...')).toBeInTheDocument()
  })

  it('shows progress indicator during download', async () => {
    const user = userEvent.setup()
    const mockOnProcessingComplete = vi.fn()
    render(<MainPage onProcessingComplete={mockOnProcessingComplete} />)
    
    const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
    const submitButton = screen.getByRole('button', { name: 'Start Practice' })
    
    // Mock successful API response
    mockedAxios.post.mockResolvedValueOnce({
      data: { jobId: 'test-job-id' }
    })
    
    await user.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await user.click(submitButton)
    
    // Should show progress indicator
    await waitFor(() => {
      expect(screen.getByText('Download in progress... (10%)')).toBeInTheDocument()
    })
  })

  it('handles download errors and shows retry button', async () => {
    const user = userEvent.setup()
    const mockOnProcessingComplete = vi.fn()
    render(<MainPage onProcessingComplete={mockOnProcessingComplete} />)
    
    const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
    const submitButton = screen.getByRole('button', { name: 'Start Practice' })
    
    // Mock API error
    mockedAxios.post.mockRejectedValueOnce({
      response: { data: { error: 'Video not found' } }
    })
    mockedAxios.isAxiosError.mockReturnValueOnce(true)
    
    await user.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await user.click(submitButton)
    
    // Should show error message and retry button
    await waitFor(() => {
      expect(screen.getByText('Video not found')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
    })
  })

  it('clears validation error when user starts typing', async () => {
    const user = userEvent.setup()
    const mockOnProcessingComplete = vi.fn()
    render(<MainPage onProcessingComplete={mockOnProcessingComplete} />)
    
    const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
    const form = input.closest('form')!
    
    // First, trigger a validation error
    await user.type(input, 'invalid-url')
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(screen.getByText('Invalid YouTube URL format')).toBeInTheDocument()
    })
    
    // Clear input and type new text
    await user.clear(input)
    await user.type(input, 'https://www.youtube.com/watch?v=')
    
    // Error should be cleared
    await waitFor(() => {
      expect(screen.queryByText('Invalid YouTube URL format')).not.toBeInTheDocument()
    })
  })

  it('disables submit button when input is empty', () => {
    const mockOnProcessingComplete = vi.fn()
    render(<MainPage onProcessingComplete={mockOnProcessingComplete} />)
    
    const submitButton = screen.getByRole('button', { name: 'Start Practice' })
    expect(submitButton).toBeDisabled()
  })

  it('disables input and submit button during loading', async () => {
    const user = userEvent.setup()
    const mockOnProcessingComplete = vi.fn()
    render(<MainPage onProcessingComplete={mockOnProcessingComplete} />)
    
    const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
    const submitButton = screen.getByRole('button', { name: 'Start Practice' })
    
    // Mock successful API response that resolves after a delay
    mockedAxios.post.mockImplementationOnce(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({ data: { jobId: 'test-job-id' } }), 100)
      )
    )
    
    await user.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await user.click(submitButton)
    
    // Should disable input and button during loading
    await waitFor(() => {
      expect(input).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Processing...' })).toBeDisabled()
    }, { timeout: 200 })
  })
})