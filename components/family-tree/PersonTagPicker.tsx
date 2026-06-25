"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { ProfileAvatar } from "./ProfileAvatar";
import { PersonSearchInput } from "./PersonSearchInput";
import { getIndividual } from "./familyGraph";
import { useGraphRevision } from "./useGraphRevision";

type PersonTagPickerProps = {
  taggedPersonIds: string[];
  onChange: (ids: string[]) => void;
};

export function PersonTagPicker({ taggedPersonIds, onChange }: PersonTagPickerProps) {
  const graphRevision = useGraphRevision();
  const [pickerValue, setPickerValue] = useState("");

  void graphRevision;

  const taggedPeople = useMemo(
    () =>
      taggedPersonIds
        .map((id) => getIndividual(id))
        .filter((person): person is NonNullable<typeof person> => person !== null),
    [taggedPersonIds, graphRevision],
  );

  const addPerson = (id: string) => {
    if (!id || taggedPersonIds.includes(id)) return;
    onChange([...taggedPersonIds, id]);
    setPickerValue("");
  };

  const removePerson = (id: string) => {
    onChange(taggedPersonIds.filter((personId) => personId !== id));
  };

  return (
    <div className="space-y-2">
      {taggedPeople.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {taggedPeople.map((person) => (
            <li
              key={person.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e8dfd0] bg-[#faf6ef] py-1 pl-2 pr-1 text-xs text-[#3d3428]"
            >
              <ProfileAvatar
                gender={person.gender}
                src={person.avatarUrl || undefined}
                className="h-4 w-4 rounded-full text-[#a8957a]"
              />
              <span>{person.name}</span>
              <button
                type="button"
                onClick={() => removePerson(person.id)}
                className="rounded-full p-0.5 text-[#8b7d6b] hover:bg-[#f0e8da] hover:text-[#3d3428]"
                aria-label={`Remove ${person.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[#8b7d6b]">No people tagged yet.</p>
      )}
      <PersonSearchInput
        label="Tag a person"
        value={pickerValue}
        onChange={addPerson}
        excludeIds={taggedPersonIds}
        placeholder="Search to tag someone…"
      />
    </div>
  );
}
