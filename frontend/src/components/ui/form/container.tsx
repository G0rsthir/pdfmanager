interface FormProps extends React.ComponentPropsWithRef<"form"> {
  children: React.ReactNode;
}

export function Form({ children, onSubmit, ...rest }: FormProps) {
  const onFormSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onSubmit?.(e);
  };

  return (
    <form {...rest} onSubmit={onFormSubmit}>
      {children}
    </form>
  );
}
