import { Dialog } from '@headlessui/react';
import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { HiOutlineCog as CogIcon } from 'react-icons/hi';

import { useAuth } from '@/contexts/AuthContext';

import useUpdateEffect from '../../hooks/useUpdateEffect';
import BaseModal from '../BaseModal';
import GradePicker from '../GradePicker';
import SchoolPicker from '../SchoolPicker';

type ISetTimetableModalProps = {
  state: [boolean, Dispatch<SetStateAction<boolean>>];
};

export default function SettingsModal({
  state: modalState,
}: ISetTimetableModalProps) {
  const schoolState = useState<string | null>(null);
  const gradeState = useState<number | null>(null);
  const { user } = useAuth();
  console.log(user);
  function reloadSettings(): void {
    async function updateDbUser() {
      if (!user) {
        throw new Error('Not logged in');
      }
      const request = await fetch(`/api/users/${user.uid}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${await user.getIdToken()}`,
        },
      });
      if (request.status !== 200) {
        throw new Error(
          `Received error HTTP status code ${request.status} ${request.statusText}`
        );
      }
      const json = await request.json();
      if (!request.ok || json?.error !== undefined) {
        throw new Error(json?.error || 'Unknown error');
      }
      if (json.school) {
        schoolState[1](json.school);
      }
      if (json.grade) {
        gradeState[1](json.grade);
      }
    }
    toast.promise(updateDbUser(), {
      loading: 'Loading settings...',
      success: <b>Settings loaded!</b>,
      error: (error: Error) => <b>Settings failed to load: {error.message}</b>,
    });
  }
  useUpdateEffect(reloadSettings, [user]);
  function submitSettings(): void {
    async function updateDbUser() {
      if (!user) {
        throw new Error('Not logged in');
      }
      const request = await fetch(`/api/users/${user.uid}`, {
        method: 'PUT',
        body: JSON.stringify({
          school: schoolState[0],
          grade: gradeState[0],
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${await user.getIdToken()}`,
        },
      });
      if (request.status !== 200) {
        throw new Error(
          `Received error HTTP status code ${request.status} ${request.statusText}`
        );
      }
      const json = await request.json();
      if (!request.ok || json?.error !== undefined) {
        throw new Error(json?.error || 'Unknown error');
      }
    }
    if (schoolState[0] || gradeState[0]) {
      toast.promise(updateDbUser(), {
        loading: 'Saving settings...',
        success: <b>Settings saved!</b>,
        error: (error: Error) => (
          <b>Settings failed to save: {error.message}</b>
        ),
      });
    }
  }
  return (
    <BaseModal
      state={modalState}
      color="emerald"
      icon={<CogIcon className="h-6 w-6 text-emerald-600" aria-hidden="true" />}
      title={
        <Dialog.Title
          as="h3"
          className="text-lg font-medium leading-6 text-gray-900"
        >
          Settings
        </Dialog.Title>
      }
      btn1text="Save"
      btn2text="Cancel"
      btn1handler={submitSettings}
      btn2handler={() => modalState[1](false)}
    >
      <div className="mt-2 flex w-full items-center">
        <span className="block basis-20 font-display text-gray-600">Name:</span>
        <input
          className="block grow rounded-lg bg-white px-4 py-2 shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300"
          type="text"
          placeholder={user?.displayName}
          disabled
        />
      </div>
      <div className="mt-2 flex w-full items-center">
        <span className="block basis-20 font-display text-gray-600">
          Email:
        </span>
        <input
          className="block grow rounded-lg bg-white px-4 py-2 shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300"
          type="text"
          placeholder={user?.email}
          disabled
        />
      </div>
      <div className="mt-2 flex w-full items-center">
        <span className="block basis-20 font-display text-gray-600">
          School:
        </span>
        <SchoolPicker state={schoolState} />
      </div>
      <div className="mt-2 flex w-full items-center">
        <span className="block basis-20 font-display text-gray-600">
          Grade:
        </span>
        <GradePicker state={gradeState} />
      </div>
    </BaseModal>
  );
}
