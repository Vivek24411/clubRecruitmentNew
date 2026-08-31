import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

import { StudentContextData } from '../context/StudentContext';
import Login from './Login';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('student web login', () => {
  const refreshProfile = vi.fn(async () => true);
  const setLoggedInStudent = vi.fn();
  let storageWrite;

  beforeEach(() => {
    window.history.replaceState({}, '', '/login');
    storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    axios.post.mockResolvedValue({ data: { success: true, msg: 'Welcome', token: 'must-not-be-persisted' } });
  });

  afterEach(() => storageWrite.mockRestore());

  it('authenticates through the HttpOnly cookie without persisting the response token', async () => {
    render(<BrowserRouter><StudentContextData.Provider value={{ refreshProfile, setLoggedInStudent }}><Login /></StudentContextData.Provider></BrowserRouter>);

    fireEvent.change(screen.getByLabelText(/^IITR email/), { target: { value: 'student@iitr.ac.in' } });
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'a secure password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(refreshProfile).toHaveBeenCalled());
    expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/student/login'), {
      email: 'student@iitr.ac.in', password: 'a secure password',
    });
    expect(storageWrite).not.toHaveBeenCalledWith('token', expect.anything());
    expect(setLoggedInStudent).toHaveBeenCalledWith(true);
  });
});
