import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import Select from 'react-select';
import { ALL_AUTHORS, EDIT_AUTHOR } from '../queries';

const Authors = (props) => {
  const [selectedName, setSelectedName] = useState(null);
  const [born, setBorn] = useState('');
  const result = useQuery(ALL_AUTHORS);
  const [changeBook] = useMutation(EDIT_AUTHOR, {
    refetchQueries: [{ query: ALL_AUTHORS }],
  });
  if (!props.show) {
    return null;
  }
  if (result.loading) {
    return <div>Loading...</div>;
  }

  const authors = result.data.allAuthors;

  const updateAuthor = (event) => {
    event.preventDefault();

    console.log('update author...');
    console.log(selectedName.value, born);
    changeBook({ variables: { name: selectedName.value, born: Number(born) } });
  };

  const handleSelect = (event) => {
    setSelectedName(event);
    const found = authors.find((a) => a.name === event.value);
    if (found.born) {
      setBorn(found.born);
    } else {
      setBorn('');
    }
  };

  return (
    <div>
      <h2>authors</h2>
      <table>
        <tbody>
          <tr>
            <th></th>
            <th>born</th>
            <th>books</th>
          </tr>
          {authors.map((a) => (
            <tr key={a.name}>
              <td>{a.name}</td>
              <td>{a.born}</td>
              <td>{a.bookCount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Set birth year</h2>

      <form onSubmit={updateAuthor}>
        <Select
          defaultValue={selectedName}
          onChange={handleSelect}
          options={authors.map((a) => {
            return { value: a.name, label: a.name };
          })}
        />
        born:{' '}
        <input value={born} onChange={({ target }) => setBorn(target.value)} />
        <button type='submit'>update author</button>
      </form>
    </div>
  );
};

export default Authors;
